import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

import { GetStorefrontRentalOffersPricingQuery } from './get-storefront-rental-offers-pricing.query';

export interface GetStorefrontRentalOffersPricingTierReadModel {
  fromUnit: number;
  toUnit: number | null;
  pricePerUnit: string;
}

export interface GetStorefrontRentalOffersPricingRatePlanReadModel {
  id: string;
  billingUnit: 'HOUR' | 'DAY' | 'WEEK';
  currency: string;
  tiers: GetStorefrontRentalOffersPricingTierReadModel[];
}

export interface GetStorefrontRentalOffersPricingItemReadModel {
  id: string;
  catalogRentalOfferId: string;
  ratePlan: GetStorefrontRentalOffersPricingRatePlanReadModel;
}

export interface GetStorefrontRentalOffersPricingResult {
  data: GetStorefrontRentalOffersPricingItemReadModel[];
}

@QueryHandler(GetStorefrontRentalOffersPricingQuery)
export class GetStorefrontRentalOffersPricingHandler implements IQueryHandler<
  GetStorefrontRentalOffersPricingQuery,
  GetStorefrontRentalOffersPricingResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetStorefrontRentalOffersPricingQuery): Promise<GetStorefrontRentalOffersPricingResult> {
    const rentalOfferPricings = await this.prisma.client.v2RentalOfferPricing.findMany({
      where: {
        tenantId: query.tenantId,
        catalogRentalOfferId: { in: query.rentalOfferIds },
        isActive: true,
        deletedAt: null,
        ratePlan: {
          tenantId: query.tenantId,
          isActive: true,
          deletedAt: null,
          tiers: { some: {} },
        },
      },
      select: {
        id: true,
        catalogRentalOfferId: true,
        ratePlan: {
          select: {
            id: true,
            billingUnit: true,
            currency: true,
            tiers: {
              select: {
                fromUnit: true,
                toUnit: true,
                pricePerUnit: true,
              },
              orderBy: { fromUnit: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      data: rentalOfferPricings.map((rentalOfferPricing) => ({
        id: rentalOfferPricing.id,
        catalogRentalOfferId: rentalOfferPricing.catalogRentalOfferId,
        ratePlan: {
          id: rentalOfferPricing.ratePlan.id,
          billingUnit: rentalOfferPricing.ratePlan.billingUnit,
          currency: rentalOfferPricing.ratePlan.currency,
          tiers: rentalOfferPricing.ratePlan.tiers.map((tier) => ({
            fromUnit: tier.fromUnit,
            toUnit: tier.toUnit,
            pricePerUnit: tier.pricePerUnit.toString(),
          })),
        },
      })),
    };
  }
}
