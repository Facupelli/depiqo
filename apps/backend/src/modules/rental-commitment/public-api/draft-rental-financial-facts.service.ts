import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { toAcceptedRentalPricingFacts } from '../application/accepted-pricing/accepted-pricing-snapshot.projections';
import { AcceptedDeliverySnapshot } from '../domain/value-objects/accepted-delivery-snapshot.value-object';
import { ConfirmedPriceSnapshot } from '../domain/value-objects/confirmed-price-snapshot.value-object';
import {
  DraftRentalFinancialFacts,
  DraftRentalFinancialFactsError,
  DraftRentalFinancialFactsResult,
  GetDraftRentalFinancialFactsInput,
} from './draft-rental-financial-facts.public-api';

@Injectable()
export class DraftRentalFinancialFactsService extends DraftRentalFinancialFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getDraftRentalFinancialFacts(
    input: GetDraftRentalFinancialFactsInput,
  ): Promise<Result<DraftRentalFinancialFactsResult, DraftRentalFinancialFactsError>> {
    // All monetary facts and their version come from the same persisted row read.
    const rental = await this.prisma.client.v2Rental.findFirst({
      where: { id: input.rentalId, tenantId: input.tenantId },
      select: {
        status: true,
        version: true,
        fulfillmentMethod: true,
        priceSnapshot: true,
        deliverySnapshot: true,
      },
    });
    if (!rental) return err({ code: 'RentalNotFound', message: 'Rental not found.' });
    if (rental.status !== 'DRAFT') return err({ code: 'RentalNotDraft', message: 'Rental must be a draft.' });

    const invalid = (message: string) => err({ code: 'DraftFinancialFactsInvalid' as const, message });
    const pricing = ConfirmedPriceSnapshot.create(rental.priceSnapshot);
    if (pricing.isErr()) return invalid(pricing.error.message);
    const { total, chargedUnits } = toAcceptedRentalPricingFacts(pricing.value.snapshot);
    let deliveryCharge: string | null = null;
    let deliveryArrangement: DraftRentalFinancialFactsResult['deliveryArrangement'] = null;
    if (rental.fulfillmentMethod === 'DELIVERY') {
      if (!rental.deliverySnapshot) return invalid('Draft delivery terms are missing.');
      const delivery = AcceptedDeliverySnapshot.create(rental.deliverySnapshot);
      if (delivery.isErr()) return invalid(delivery.error.message);
      if (delivery.value.snapshot.currency !== total.currency) {
        return invalid('Draft delivery currency must match equipment pricing currency.');
      }
      deliveryCharge = delivery.value.effectiveDeliveryCharge;
      deliveryArrangement = delivery.value.snapshot.arrangement;
    } else if (rental.deliverySnapshot !== null) {
      return invalid('Pickup rentals cannot have delivery terms.');
    }

    return ok({
      rentalVersion: rental.version,
      equipmentAndInsuranceAmount: total.amount,
      deliveryCharge,
      deliveryArrangement,
      customerTotal: new Decimal(total.amount).plus(deliveryCharge ?? '0').toString(),
      currency: total.currency,
      chargedUnits,
    });
  }
}
