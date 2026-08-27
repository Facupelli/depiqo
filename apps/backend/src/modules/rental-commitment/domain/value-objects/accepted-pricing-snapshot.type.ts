export const ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA = 'v2.rental-price-snapshot' as const;
export const ACCEPTED_RENTAL_PRICING_SNAPSHOT_VERSION = 2 as const;

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

export type AcceptedRentalPricingBreakdown = {
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
  appliedPromotions: Array<{
    promotionId: string;
    name: string;
    activation: 'AUTOMATIC' | 'COUPON_REQUIRED';
    effectType: 'PERCENTAGE_OFF' | 'FIXED_AMOUNT_OFF';
    effectValue: string;
    target: 'ORDER' | 'ELIGIBLE_LINES';
    amount: string;
  }>;
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

export type AcceptedRentalPricingSnapshot = {
  schema: typeof ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA;
  version: typeof ACCEPTED_RENTAL_PRICING_SNAPSHOT_VERSION;
  calculatedAtIso: string;
  context: AcceptedRentalPricingContext;
  calculated: AcceptedRentalPricingBreakdown;
  final: AcceptedRentalPricingBreakdown;
  manualPricingAdjustment?: AcceptedRentalManualPricingAdjustment;
  insurance: { applied: boolean; amount: string };
  totalBeforeInsurance: string;
  total: string;
};
