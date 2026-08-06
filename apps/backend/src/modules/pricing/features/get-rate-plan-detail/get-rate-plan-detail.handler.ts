import { GetRatePlanDetailResponseDto } from '@repo/api-contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { getRatePlanDetailError, GetRatePlanDetailError } from './get-rate-plan-detail.errors';
import { GetRatePlanDetailQuery } from './get-rate-plan-detail.query';

export type GetRatePlanDetailResult = GetRatePlanDetailResponseDto;

@QueryHandler(GetRatePlanDetailQuery)
export class GetRatePlanDetailHandler implements IQueryHandler<
  GetRatePlanDetailQuery,
  Result<GetRatePlanDetailResult, GetRatePlanDetailError>
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetRatePlanDetailQuery): Promise<Result<GetRatePlanDetailResult, GetRatePlanDetailError>> {
    const ratePlan = await this.prisma.client.v2RatePlan.findFirst({
      where: {
        id: query.ratePlanId,
        tenantId: query.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        billingUnit: true,
        currency: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        tiers: {
          select: { id: true, fromUnit: true, toUnit: true, pricePerUnit: true },
          orderBy: { fromUnit: 'asc' },
        },
        rentalOfferPricings: {
          where: { tenantId: query.tenantId, deletedAt: null },
          select: { id: true, catalogRentalOfferId: true, isActive: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ratePlan) {
      return err(
        getRatePlanDetailError('pricing.rate_plan_not_found', 'Rate plan not found.', undefined, {
          useCase: 'GetRatePlanDetail',
          tenantId: query.tenantId,
          ratePlanId: query.ratePlanId,
        }),
      );
    }

    const rentalOfferIds = ratePlan.rentalOfferPricings.map((assignment) => assignment.catalogRentalOfferId);

    // TODO: Replace this direct cross-module Prisma read with a Catalog public read API.
    // Rental offers and rentable-item presentation data belong to the Catalog module.
    const rentalOffers = await this.prisma.client.v2RentalOffer.findMany({
      where: {
        tenantId: query.tenantId,
        id: { in: rentalOfferIds },
      },
      select: {
        id: true,
        branchId: true,
        rentableItemId: true,
        isVisible: true,
        isRentable: true,
        deletedAt: true,
        rentableItem: { select: { name: true } },
      },
    });
    const rentalOfferById = new Map(rentalOffers.map((rentalOffer) => [rentalOffer.id, rentalOffer]));

    const assignments = ratePlan.rentalOfferPricings.map((assignment) => {
      const rentalOffer = rentalOfferById.get(assignment.catalogRentalOfferId);

      return {
        rentalOfferPricingId: assignment.id,
        isActive: assignment.isActive,
        rentalOffer: rentalOffer
          ? {
              id: rentalOffer.id,
              branchId: rentalOffer.branchId,
              rentableItemId: rentalOffer.rentableItemId,
              rentableItemName: rentalOffer.rentableItem.name,
              isVisible: rentalOffer.isVisible,
              isRentable: rentalOffer.isRentable,
              isDeleted: rentalOffer.deletedAt !== null,
            }
          : null,
      };
    });

    return ok({
      id: ratePlan.id,
      name: ratePlan.name,
      billingUnit: ratePlan.billingUnit,
      currency: ratePlan.currency,
      isActive: ratePlan.isActive,
      createdAt: ratePlan.createdAt.toISOString(),
      updatedAt: ratePlan.updatedAt.toISOString(),
      tiers: ratePlan.tiers.map((tier) => ({
        id: tier.id,
        fromUnit: tier.fromUnit,
        toUnit: tier.toUnit,
        pricePerUnit: tier.pricePerUnit.toString(),
      })),
      assignments,
      assignmentCount: assignments.length,
      activeAssignmentCount: assignments.filter((assignment) => assignment.isActive).length,
    });
  }
}
