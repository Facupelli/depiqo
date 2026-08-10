import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';
import { prismaDateToLocalDate } from 'src/core/temporal/local-date';
import { Prisma } from 'src/generated/prisma/client';

import { BasePricingRatePlanInput } from '../pricing-engine/base/base-pricing-input.type';
import { CouponPricingInput } from '../pricing-engine/coupons/coupon-input.types';
import { CouponNotApplicableError } from '../pricing-engine/errors/pricing.errors';
import { PromotionPricingInput } from '../pricing-engine/promotions/promotion-input.types';

type PromotionRow = Prisma.V2PromotionGetPayload<{ include: { scopes: true; exclusions: true } }>;
type CouponRow = Prisma.V2CouponGetPayload<{ include: { promotion: { include: { scopes: true; exclusions: true } } } }>;
type RentalOfferPricingRow = Prisma.V2RentalOfferPricingGetPayload<{
  include: { ratePlan: { include: { tiers: true } } };
}>;

export type PricingCalculationContext = {
  automaticPromotions: PromotionPricingInput[];
  coupon?: CouponPricingInput;
  ratePlansByRentalOfferId: Map<string, BasePricingRatePlanInput>;
};

export type LoadPricingCalculationContextInput = {
  tenantId: string;
  customerId?: string;
  couponCode?: string;
  rentalOfferIds: string[];
};

@Injectable()
export class PricingContextLoader {
  constructor(private readonly prisma: PrismaService) {}

  async loadPricingCalculationContext(input: LoadPricingCalculationContextInput): Promise<PricingCalculationContext> {
    const [automaticPromotions, coupon, ratePlansByRentalOfferId] = await Promise.all([
      this.loadAutomaticPromotions(input.tenantId),
      input.couponCode
        ? this.resolveCouponForPricing({
            tenantId: input.tenantId,
            code: input.couponCode,
            customerId: input.customerId,
          })
        : Promise.resolve(undefined),
      this.loadRentalOfferRatePlans({ tenantId: input.tenantId, rentalOfferIds: input.rentalOfferIds }),
    ]);

    return { automaticPromotions, coupon, ratePlansByRentalOfferId };
  }

  private async loadRentalOfferRatePlans(input: {
    tenantId: string;
    rentalOfferIds: string[];
  }): Promise<Map<string, BasePricingRatePlanInput>> {
    const rows: RentalOfferPricingRow[] = await this.prisma.client.v2RentalOfferPricing.findMany({
      where: {
        tenantId: input.tenantId,
        catalogRentalOfferId: { in: input.rentalOfferIds },
        isActive: true,
        deletedAt: null,
      },
      include: {
        ratePlan: {
          include: {
            tiers: { orderBy: [{ fromUnit: 'asc' }] },
          },
        },
      },
    });

    return new Map(
      rows
        .filter((row) => row.ratePlan.isActive && !row.ratePlan.deletedAt)
        .map((row) => [
          row.catalogRentalOfferId,
          {
            id: row.ratePlan.id,
            billingUnit: row.ratePlan.billingUnit,
            currency: row.ratePlan.currency,
            tiers: row.ratePlan.tiers.map((tier) => ({
              id: tier.id,
              fromUnit: tier.fromUnit,
              toUnit: tier.toUnit,
              pricePerUnit: String(tier.pricePerUnit),
            })),
          },
        ]),
    );
  }

  private async loadAutomaticPromotions(tenantId: string): Promise<PromotionPricingInput[]> {
    const rows: PromotionRow[] = await this.prisma.client.v2Promotion.findMany({
      where: { tenantId, isActive: true, activation: 'AUTOMATIC', deletedAt: null },
      include: { scopes: true, exclusions: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    return rows.map(mapPromotion);
  }

  private async resolveCouponForPricing(input: {
    tenantId: string;
    code: string;
    customerId?: string;
  }): Promise<CouponPricingInput> {
    const coupon: CouponRow | null = await this.prisma.client.v2Coupon.findUnique({
      where: { tenantId_code: { tenantId: input.tenantId, code: input.code } },
      include: { promotion: { include: { scopes: true, exclusions: true } } },
    });

    if (!coupon || coupon.deletedAt) {
      throw new CouponNotApplicableError(`Coupon "${input.code}" was not found or is not available.`);
    }

    const [currentTotalRedemptions, currentCustomerRedemptions] = await Promise.all([
      this.prisma.client.v2CouponRedemption.count({ where: { couponId: coupon.id, voidedAt: null } }),
      input.customerId
        ? this.prisma.client.v2CouponRedemption.count({
            where: { couponId: coupon.id, customerId: input.customerId, voidedAt: null },
          })
        : Promise.resolve(undefined),
    ]);

    return {
      id: coupon.id,
      tenantId: coupon.tenantId,
      promotionId: coupon.promotionId,
      code: coupon.code,
      isActive: coupon.isActive,
      validFrom: coupon.validFrom ? prismaDateToLocalDate(coupon.validFrom) : null,
      validUntil: coupon.validUntil ? prismaDateToLocalDate(coupon.validUntil) : null,
      maxUses: coupon.maxUses,
      maxUsesPerCustomer: coupon.maxUsesPerCustomer,
      restrictedToCustomerId: coupon.restrictedToCustomerId,
      currentTotalRedemptions,
      currentCustomerRedemptions,
      promotion: mapPromotion(coupon.promotion),
    };
  }
}

function mapPromotion(row: PromotionRow): PromotionPricingInput {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    activation: row.activation,
    priority: row.priority,
    stackable: row.stackable,
    isActive: row.isActive,
    validFrom: row.validFrom ? prismaDateToLocalDate(row.validFrom) : null,
    validUntil: row.validUntil ? prismaDateToLocalDate(row.validUntil) : null,
    effectType: row.effectType,
    effectValue: String(row.effectValue),
    target: row.target,
    minOrderSubtotal: row.minOrderSubtotal == null ? null : String(row.minOrderSubtotal),
    minRentalUnits: row.minRentalUnits,
    maxRentalUnits: row.maxRentalUnits,
    scopes: row.scopes.map((scope) => ({
      appliesToAll: scope.appliesToAll,
      rentableItemId: scope.rentableItemId,
      rentalOfferId: scope.rentalOfferId,
      categoryId: scope.categoryId,
    })),
    exclusions: row.exclusions.map((exclusion) => ({
      rentableItemId: exclusion.rentableItemId,
      rentalOfferId: exclusion.rentalOfferId,
      categoryId: exclusion.categoryId,
    })),
  };
}
