import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { GetRentalDetailResponseDto } from '@repo/api-contracts';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { getRentalDetailError, GetRentalDetailError } from './get-rental-detail.errors';
import {
  parseLegacyRentalDetailPricing,
  parseLegacyRentalDetailPricingLine,
  parseV2RentalDetailPricing,
} from './get-rental-detail-pricing-snapshot.decoder';
import { GetRentalDetailQuery } from './get-rental-detail.query';

export type GetRentalDetailResult = Result<GetRentalDetailResponseDto, GetRentalDetailError>;

@QueryHandler(GetRentalDetailQuery)
export class GetRentalDetailHandler implements IQueryHandler<GetRentalDetailQuery, GetRentalDetailResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetRentalDetailQuery): Promise<GetRentalDetailResult> {
    const rental = await this.prisma.client.v2Rental.findFirst({
      where: {
        id: query.rentalId,
        tenantId: query.tenantId,
      },
      select: {
        id: true,
        status: true,
        source: true,
        notes: true,
        insuranceSelected: true,
        fulfillmentMethod: true,
        periodStart: true,
        periodEnd: true,
        priceSnapshot: true,
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
          select: {
            id: true,
            rentalOfferId: true,
            rentableItemId: true,
            rentableItemNameSnapshot: true,
            rentableItemKindSnapshot: true,
            quantity: true,
            priceSnapshot: true,
            demandLines: {
              select: {
                id: true,
                rentalSelectionId: true,
                equipmentTypeId: true,
                equipmentTypeNameSnapshot: true,
                quantity: true,
                assignedAssets: { select: { assetId: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
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

    return ok({
      id: rental.id,
      number: rental.id.slice(0, 4),
      status: rental.status,
      source: rental.source,
      notes: rental.notes,
      insuranceSelected: rental.insuranceSelected,
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
      pricing: this.resolvePricing(rental.priceSnapshot, rental.selections),
    });
  }

  private resolvePricing(
    priceSnapshot: unknown,
    selections: Array<{ id: string; rentableItemNameSnapshot: string; priceSnapshot: unknown }>,
  ): GetRentalDetailResponseDto['pricing'] {
    const v2Pricing = parseV2RentalDetailPricing(priceSnapshot);
    if (v2Pricing) return v2Pricing;

    const legacyPricing = parseLegacyRentalDetailPricing(priceSnapshot);
    if (!legacyPricing) return null;

    return {
      ...legacyPricing,
      lines: selections.flatMap((selection) => {
        const pricingLine = parseLegacyRentalDetailPricingLine(selection.priceSnapshot);
        return pricingLine
          ? [{ rentalSelectionId: selection.id, label: selection.rentableItemNameSnapshot, ...pricingLine }]
          : [];
      }),
    };
  }
}
