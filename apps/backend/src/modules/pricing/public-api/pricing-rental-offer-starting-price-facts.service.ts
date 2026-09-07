import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  GetPricingRentalOfferStartingPriceFactsInput,
  PricingRentalOfferStartingPriceFact,
  PricingRentalOfferStartingPriceFacts,
} from './pricing-rental-offer-starting-price-facts.public-api';

@Injectable()
export class PricingRentalOfferStartingPriceFactsService extends PricingRentalOfferStartingPriceFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getFacts(input: GetPricingRentalOfferStartingPriceFactsInput): Promise<PricingRentalOfferStartingPriceFact[]> {
    const rentalOfferIds = [...new Set(input.rentalOfferIds)];
    if (rentalOfferIds.length === 0) return [];

    const assignments = await this.prisma.client.v2RentalOfferPricing.findMany({
      where: {
        tenantId: input.tenantId,
        catalogRentalOfferId: { in: rentalOfferIds },
        isActive: true,
        deletedAt: null,
        ratePlan: {
          tenantId: input.tenantId,
          isActive: true,
          deletedAt: null,
          tiers: { some: { fromUnit: 1 } },
        },
      },
      select: {
        catalogRentalOfferId: true,
        ratePlan: {
          select: {
            currency: true,
            billingUnit: true,
            tiers: {
              where: { fromUnit: 1 },
              select: { pricePerUnit: true },
            },
          },
        },
      },
    });

    return assignments.flatMap((assignment) => {
      const tier = assignment.ratePlan.tiers[0];
      return tier
        ? [
            {
              rentalOfferId: assignment.catalogRentalOfferId,
              amount: tier.pricePerUnit.toString(),
              currency: assignment.ratePlan.currency,
              billingUnit: assignment.ratePlan.billingUnit,
            },
          ]
        : [];
    });
  }
}
