import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { GetRentalDetailOwnerPayoutDto, GetRentalDetailResponseDto } from '@repo/api-contracts';
import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { AssetInventoryDisplayFacts } from 'src/modules/asset-inventory/public-api/asset-inventory-display-facts.public-api';
import { getRentalDetailError, GetRentalDetailError } from './get-rental-detail.errors';
import { toRentalDetailPricing } from '../../application/accepted-pricing/accepted-pricing-snapshot.projections';
import { AcceptedDeliverySnapshot } from '../../domain/value-objects/accepted-delivery-snapshot.value-object';
import { ConfirmedPriceSnapshot } from '../../domain/value-objects/confirmed-price-snapshot.value-object';
import { GetRentalDetailQuery } from './get-rental-detail.query';

export type GetRentalDetailResult = Result<GetRentalDetailResponseDto, GetRentalDetailError>;

@QueryHandler(GetRentalDetailQuery)
export class GetRentalDetailHandler implements IQueryHandler<GetRentalDetailQuery, GetRentalDetailResult> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetInventoryDisplayFacts: AssetInventoryDisplayFacts,
  ) {}

  async execute(query: GetRentalDetailQuery): Promise<GetRentalDetailResult> {
    const rental = await this.prisma.client.v2Rental.findFirst({
      where: {
        id: query.rentalId,
        tenantId: query.tenantId,
      },
      select: {
        id: true,
        rentalNumber: true,
        status: true,
        source: true,
        notes: true,
        insuranceSelected: true,
        fulfillmentMethod: true,
        periodStart: true,
        periodEnd: true,
        priceSnapshot: true,
        acceptedDeliverySnapshot: true,
        acceptedCustomerTotal: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        cancelledAt: true,
        confirmedAt: true,
        branchId: true,
        customerId: true,
        deliveryDetails: {
          select: {
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
            contactName: true,
            contactPhone: true,
            notes: true,
          },
        },
        selections: {
          where: { removedAt: null },
          select: {
            id: true,
            rentalOfferId: true,
            rentableItemId: true,
            rentableItemNameSnapshot: true,
            rentableItemKindSnapshot: true,
            quantity: true,
            priceSnapshot: true,
            demandLines: {
              where: { removedAt: null },
              select: {
                id: true,
                rentalSelectionId: true,
                equipmentTypeId: true,
                equipmentTypeNameSnapshot: true,
                quantity: true,
                assignedAssets: {
                  where: { effectiveUntil: null },
                  select: { assetId: true },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        ownerSplits: {
          select: {
            ownerId: true,
            rentalDemandLineId: true,
            ownerAmount: true,
            currency: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        accessorySelections: {
          select: {
            id: true,
            sourceRentalDemandLineId: true,
            equipmentTypeId: true,
            equipmentTypeNameSnapshot: true,
            quantity: true,
            assignments: { select: { assetId: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!rental) {
      return err(
        getRentalDetailError(
          'rental_commitment.rental_not_found',
          `Rental "${query.rentalId}" was not found.`,
          undefined,
          { useCase: 'GetRentalDetail', tenantId: query.tenantId, rentalId: query.rentalId },
        ),
      );
    }

    const ownerPayouts = await this.buildOwnerPayoutSummary(query.tenantId, rental.ownerSplits, rental.selections);

    return ok({
      id: rental.id,
      rentalNumber: rental.rentalNumber,
      status: rental.status,
      source: rental.source,
      notes: rental.notes,
      insuranceSelected: rental.insuranceSelected,
      version: rental.version,
      createdAt: rental.createdAt.toISOString(),
      updatedAt: rental.updatedAt.toISOString(),
      cancelledAt: rental.cancelledAt?.toISOString() ?? null,
      confirmedAt: rental.confirmedAt?.toISOString() ?? null,
      customerId: rental.customerId,
      branchId: rental.branchId,
      period: {
        start: rental.periodStart.toISOString(),
        end: rental.periodEnd.toISOString(),
      },
      fulfillment: {
        method: rental.fulfillmentMethod,
        deliveryDetails: rental.deliveryDetails,
      },
      selections: rental.selections.map((selection) => ({
        id: selection.id,
        rentalOfferId: selection.rentalOfferId,
        rentableItemId: selection.rentableItemId,
        rentableItemName: selection.rentableItemNameSnapshot,
        rentableItemKind: selection.rentableItemKindSnapshot,
        quantity: selection.quantity,
        demandLines: selection.demandLines.map((line) => ({
          id: line.id,
          rentalSelectionId: line.rentalSelectionId,
          equipmentTypeId: line.equipmentTypeId,
          equipmentTypeName: line.equipmentTypeNameSnapshot,
          quantity: line.quantity,
          assignedAssets: line.assignedAssets.map((assignment) => ({ assetId: assignment.assetId })),
        })),
      })),
      accessories: rental.accessorySelections.map((selection) => ({
        id: selection.id,
        sourceRentalDemandLineId: selection.sourceRentalDemandLineId,
        equipmentTypeId: selection.equipmentTypeId,
        equipmentTypeName: selection.equipmentTypeNameSnapshot,
        quantity: selection.quantity,
        assignedAssets: selection.assignments.map((assignment) => ({ assetId: assignment.assetId })),
      })),
      pricing: this.resolvePricing(rental.priceSnapshot),
      acceptedCustomerTotal: rental.confirmedAt ? (rental.acceptedCustomerTotal?.toString() ?? null) : null,
      acceptedDelivery: rental.confirmedAt ? this.resolveAcceptedDelivery(rental.acceptedDeliverySnapshot) : null,
      ownerPayouts,
    });
  }

  private async buildOwnerPayoutSummary(
    tenantId: string,
    splits: Array<{ ownerId: string; rentalDemandLineId: string; ownerAmount: Decimal; currency: string }>,
    selections: Array<{
      demandLines: Array<{ id: string; equipmentTypeNameSnapshot: string }>;
    }>,
  ): Promise<GetRentalDetailOwnerPayoutDto[]> {
    if (splits.length === 0) return [];

    const currencies = new Set(splits.map((split) => split.currency));
    if (currencies.size !== 1) throw new Error('Rental owner payouts use multiple currencies.');

    const ownerIds = [...new Set(splits.map((split) => split.ownerId))];
    const ownerFacts = await this.assetInventoryDisplayFacts.getOwnerDisplayFacts({ tenantId, ownerIds });
    const ownerNamesById = new Map(ownerFacts.map((owner) => [owner.ownerId, owner.name]));
    const equipmentNamesByDemandLineId = new Map(
      selections.flatMap((selection) =>
        selection.demandLines.map((line) => [line.id, line.equipmentTypeNameSnapshot] as const),
      ),
    );
    const payoutsByOwnerId = new Map<
      string,
      {
        ownerName: string;
        currency: string;
        total: Decimal;
        lines: Map<string, { equipmentName: string; quantity: number }>;
      }
    >();

    for (const split of splits) {
      const ownerName = ownerNamesById.get(split.ownerId);
      if (!ownerName) throw new Error(`Owner display facts were not found for owner "${split.ownerId}".`);

      const equipmentName = equipmentNamesByDemandLineId.get(split.rentalDemandLineId);
      if (!equipmentName) {
        throw new Error(`Rental demand line "${split.rentalDemandLineId}" was not found for an owner payout.`);
      }

      const existing = payoutsByOwnerId.get(split.ownerId);
      if (existing) {
        if (existing.currency !== split.currency) {
          throw new Error(`Owner "${split.ownerId}" has rental payouts in multiple currencies.`);
        }
        existing.total = existing.total.plus(split.ownerAmount);
        const line = existing.lines.get(split.rentalDemandLineId);
        if (line) line.quantity += 1;
        else existing.lines.set(split.rentalDemandLineId, { equipmentName, quantity: 1 });
        continue;
      }

      payoutsByOwnerId.set(split.ownerId, {
        ownerName,
        currency: split.currency,
        total: new Decimal(split.ownerAmount),
        lines: new Map([[split.rentalDemandLineId, { equipmentName, quantity: 1 }]]),
      });
    }

    return [...payoutsByOwnerId.entries()].map(([ownerId, payout]) => ({
      ownerId,
      ownerName: payout.ownerName,
      currency: payout.currency,
      total: payout.total.toFixed(),
      lines: [...payout.lines.entries()].map(([rentalDemandLineId, line]) => ({
        rentalDemandLineId,
        equipmentName: line.equipmentName,
        quantity: line.quantity,
      })),
    }));
  }

  private resolvePricing(priceSnapshot: unknown): GetRentalDetailResponseDto['pricing'] {
    if (priceSnapshot === null) return null;
    const snapshot = ConfirmedPriceSnapshot.create(priceSnapshot);
    if (snapshot.isErr()) throw snapshot.error;
    return toRentalDetailPricing(snapshot.value.snapshot);
  }

  private resolveAcceptedDelivery(acceptedDeliverySnapshot: unknown): GetRentalDetailResponseDto['acceptedDelivery'] {
    if (acceptedDeliverySnapshot === null) return null;
    const snapshot = AcceptedDeliverySnapshot.create(acceptedDeliverySnapshot);
    if (snapshot.isErr()) throw snapshot.error;
    return snapshot.value.snapshot;
  }
}
