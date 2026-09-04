export const ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA = 'v2.rental-price-snapshot' as const;
export const ACCEPTED_RENTAL_PRICING_SNAPSHOT_V2_VERSION = 2 as const;
export const ACCEPTED_RENTAL_PRICING_SNAPSHOT_V3_VERSION = 3 as const;
export const ACCEPTED_RENTAL_PRICING_SNAPSHOT_VERSION = ACCEPTED_RENTAL_PRICING_SNAPSHOT_V3_VERSION;

export type AcceptedRentalPricingContext = 'DRAFT' | 'CONFIRMED' | 'CONFIRM_DRAFT' | 'REPRICE';
export type AcceptedRentalPricingAdjustmentDirection = 'INCREASE' | 'DECREASE' | 'NONE';

export type AcceptedRentalPricingLine = {
  rentalSelectionId: string;
  rentalOfferId: string;
  rentableItemId: string;
  rentableItemName: string;
  categoryId?: string;
  quantity: number;
  chargedUnits: number;
  billingUnit: 'HOUR' | 'DAY' | 'WEEK';
  ratePlanId?: string;
  appliedTierId?: string;
  pricePerUnit: string;
  subtotal: string;
  discountTotal: string;
  total: string;
  appliedAdjustments: Array<{
    type: 'PROMOTION' | 'COUPON';
    promotionId: string;
    couponId?: string;
    name: string;
    amount: string;
  }>;
  manualPricingAdjustment?: {
    mode: 'TARGET_TOTAL_ALLOCATION';
    direction: AcceptedRentalPricingAdjustmentDirection;
    amount: string;
    setByTenantUserId: string;
    setAtIso: string;
    reason?: string;
  };
};

type AcceptedRentalAppliedPromotion = {
  promotionId: string;
  name: string;
  activation: 'AUTOMATIC' | 'COUPON_REQUIRED';
  effectType: 'PERCENTAGE_OFF' | 'FIXED_AMOUNT_OFF';
  effectValue: string;
  amount: string;
};

export type AcceptedRentalPricingV2AppliedPromotion = AcceptedRentalAppliedPromotion & {
  target: 'ORDER' | 'ELIGIBLE_LINES';
};

export type AcceptedRentalPricingV3AppliedPromotion = AcceptedRentalAppliedPromotion;

export type AcceptedRentalPricingBreakdown<
  TAppliedPromotion extends AcceptedRentalAppliedPromotion = AcceptedRentalPricingV3AppliedPromotion,
> = {
  currency: string;
  subtotal: string;
  discountTotal: string;
  total: string;
  chargedDays: number;
  durationPolicySnapshot: {
    timezone: string;
    dailyBillingPolicy: 'IGNORE_PARTIAL_DAY' | 'BILL_OVER_QUARTER_DAY' | 'BILL_OVER_HALF_DAY' | 'BILL_ANY_PARTIAL_DAY';
    weekendCountsAsOne: boolean;
    minimumChargedDays: number;
    quarterDayThresholdMinutes?: number;
    halfDayThresholdMinutes?: number;
  };
  lines: AcceptedRentalPricingLine[];
  appliedPromotions: TAppliedPromotion[];
  appliedCoupon?: { couponId: string; code: string; promotionId: string; amount: string };
};

export type AcceptedRentalManualPricingAdjustment = {
  mode: 'TARGET_TOTAL';
  targetTotal: string;
  previousTotal: string;
  direction: AcceptedRentalPricingAdjustmentDirection;
  adjustmentTotal: string;
  setByTenantUserId: string;
  setAtIso: string;
  reason?: string;
};

type AcceptedRentalPricingSnapshotBase<
  TVersion extends 2 | 3,
  TAppliedPromotion extends AcceptedRentalAppliedPromotion,
> = {
  schema: typeof ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA;
  version: TVersion;
  calculatedAtIso: string;
  context: AcceptedRentalPricingContext;
  calculated: AcceptedRentalPricingBreakdown<TAppliedPromotion>;
  final: AcceptedRentalPricingBreakdown<TAppliedPromotion>;
  manualPricingAdjustment?: AcceptedRentalManualPricingAdjustment;
  insurance: { applied: boolean; amount: string };
  totalBeforeInsurance: string;
  total: string;
};

export type AcceptedRentalPricingV2Snapshot = AcceptedRentalPricingSnapshotBase<
  typeof ACCEPTED_RENTAL_PRICING_SNAPSHOT_V2_VERSION,
  AcceptedRentalPricingV2AppliedPromotion
>;

export type AcceptedRentalPricingV3Snapshot = AcceptedRentalPricingSnapshotBase<
  typeof ACCEPTED_RENTAL_PRICING_SNAPSHOT_V3_VERSION,
  AcceptedRentalPricingV3AppliedPromotion
>;

export type AcceptedRentalPricingSnapshot = AcceptedRentalPricingV2Snapshot | AcceptedRentalPricingV3Snapshot;

export function toAcceptedRentalPricingV3Snapshot(
  snapshot: AcceptedRentalPricingSnapshot,
): AcceptedRentalPricingV3Snapshot {
  return {
    ...snapshot,
    version: ACCEPTED_RENTAL_PRICING_SNAPSHOT_VERSION,
    calculated: withoutPromotionTargets(snapshot.calculated),
    final: withoutPromotionTargets(snapshot.final),
  };
}

function withoutPromotionTargets(
  breakdown: AcceptedRentalPricingSnapshot['calculated'],
): AcceptedRentalPricingBreakdown {
  return {
    ...breakdown,
    appliedPromotions: breakdown.appliedPromotions.map((promotion) => ({
      promotionId: promotion.promotionId,
      name: promotion.name,
      activation: promotion.activation,
      effectType: promotion.effectType,
      effectValue: promotion.effectValue,
      amount: promotion.amount,
    })),
  };
}
