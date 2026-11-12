import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { GetRentalConfirmationSummaryResponseDto } from '@repo/api-contracts';
import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { RentalConfirmationDeliveryService } from '../../application/rental-confirmation-delivery.service';
import { AcceptedDeliverySnapshot } from '../../domain/value-objects/accepted-delivery-snapshot.value-object';
import { ConfirmedPriceSnapshot } from '../../domain/value-objects/confirmed-price-snapshot.value-object';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { confirmRentalError, ConfirmRentalError } from '../confirm-rental/confirm-rental.errors';
import { GetRentalConfirmationSummaryQuery } from './get-rental-confirmation-summary.query';

export type GetRentalConfirmationSummaryResult = Result<GetRentalConfirmationSummaryResponseDto, ConfirmRentalError>;

@QueryHandler(GetRentalConfirmationSummaryQuery)
export class GetRentalConfirmationSummaryHandler implements IQueryHandler<
  GetRentalConfirmationSummaryQuery,
  GetRentalConfirmationSummaryResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly confirmationDelivery: RentalConfirmationDeliveryService,
  ) {}

  async execute(query: GetRentalConfirmationSummaryQuery): Promise<GetRentalConfirmationSummaryResult> {
    const rental = await this.prisma.client.v2Rental.findFirst({
      where: { tenantId: query.tenantId, id: query.rentalId },
      select: {
        status: true,
        version: true,
        branchId: true,
        periodStart: true,
        periodEnd: true,
        fulfillmentMethod: true,
        priceSnapshot: true,
        deliverySnapshot: true,
        deliveryDetails: {
          select: { address: true, formattedAddress: true, latitude: true, longitude: true, providerPlaceId: true },
        },
      },
    });
    if (!rental) return err(confirmRentalError('rental_commitment.rental_not_found', 'Rental not found.'));
    if (rental.status !== 'DRAFT')
      return err(
        confirmRentalError('rental_commitment.rental_cannot_be_confirmed_from_status', 'Only drafts can be confirmed.'),
      );
    if (!rental.priceSnapshot)
      return err(
        confirmRentalError(
          'rental_commitment.confirmed_rental_requires_price_snapshot',
          'Confirmation requires existing pricing.',
        ),
      );
    // Confirmation accepts persisted equipment/insurance pricing. Never resolve current Catalog offers here.
    const pricing = ConfirmedPriceSnapshot.create(rental.priceSnapshot);
    if (pricing.isErr()) throw pricing.error;
    let storedDelivery: AcceptedDeliverySnapshot | undefined;
    if (rental.deliverySnapshot) {
      const parsed = AcceptedDeliverySnapshot.create(rental.deliverySnapshot);
      if (parsed.isErr()) throw parsed.error;
      storedDelivery = parsed.value;
    }
    const delivery = await this.confirmationDelivery.resolve({
      tenantId: query.tenantId,
      branchId: rental.branchId,
      period: new RentalPeriod(rental.periodStart, rental.periodEnd),
      fulfillmentMethod: rental.fulfillmentMethod,
      deliveryDetails: rental.deliveryDetails
        ? {
            address: rental.deliveryDetails.address,
            formattedAddress: rental.deliveryDetails.formattedAddress ?? undefined,
            latitude: rental.deliveryDetails.latitude ?? undefined,
            longitude: rental.deliveryDetails.longitude ?? undefined,
            providerPlaceId: rental.deliveryDetails.providerPlaceId ?? undefined,
          }
        : undefined,
      existing: storedDelivery?.snapshot,
    });
    if (delivery.isErr()) return err(delivery.error);
    if (rental.fulfillmentMethod === 'DELIVERY' && !delivery.value) {
      throw new Error('Delivery confirmation requires revalidated delivery terms.');
    }
    const price = pricing.value.snapshot;
    if (delivery.value && delivery.value.snapshot.currency !== price.final.currency) {
      throw new Error(
        `Pricing currency ${price.final.currency} does not match Delivery currency ${delivery.value.snapshot.currency}.`,
      );
    }
    return ok({
      rentalVersion: rental.version,
      equipmentAmount: price.final.total,
      insuranceAmount: price.insurance.amount,
      deliveryCharge: delivery.value?.effectiveDeliveryCharge ?? null,
      customerTotal: new Decimal(price.total).plus(delivery.value?.effectiveDeliveryCharge ?? '0').toString(),
      currency: price.final.currency,
    });
  }
}
