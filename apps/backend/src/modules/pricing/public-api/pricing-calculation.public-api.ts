import { Result } from 'neverthrow';

export type PricingDurationPolicySnapshot = {
  timezone: string;
  dailyBillingPolicy: 'IGNORE_PARTIAL_DAY' | 'BILL_OVER_HALF_DAY' | 'BILL_ANY_PARTIAL_DAY';
  minimumChargedDays: number;
  halfDayThresholdMinutes?: number;
};

export type PricingCalculationRequest = {
  tenantId: string;
  rentalPeriod: { start: Date; end: Date };
  calculationFacts: {
    effectiveTimezone: string;
    dailyBillingPolicy: 'IGNORE_PARTIAL_DAY' | 'BILL_OVER_HALF_DAY' | 'BILL_ANY_PARTIAL_DAY';
  };
  lines: Array<{
    lineReference: string;
    rentalOfferId: string;
    rentableItemId: string;
    categoryId?: string;
    quantity: number;
  }>;
  customerId?: string;
  couponCode?: string;
  calculationDate?: Date;
  targetTotalAdjustment?: { targetTotal: string };
};

export type PricingCalculationLine = {
  lineReference: string;
  rentalOfferId: string;
  rentableItemId: string;
  categoryId?: string;
  quantity: number;
  ratePlanId: string;
  billingUnit: 'HOUR' | 'DAY' | 'WEEK';
  chargedUnits: number;
  appliedTier: { tierId: string; fromUnit: number; toUnit: number | null; pricePerUnit: string };
  subtotal: string;
  discountTotal: string;
  total: string;
  appliedAdjustments: Array<{ type: string; promotionId: string; couponId?: string; name: string; amount: string }>;
  targetTotalAllocation?: { direction: 'INCREASE' | 'DECREASE' | 'NONE'; amount: string };
};

export type PricingCalculationBreakdown = {
  currency: string;
  subtotal: string;
  discountTotal: string;
  total: string;
  chargedDays: number;
  durationPolicy: PricingDurationPolicySnapshot;
  lines: PricingCalculationLine[];
  appliedPromotions: Array<{
    promotionId: string;
    name: string;
    activation: 'AUTOMATIC' | 'COUPON_REQUIRED';
    effectType: 'PERCENTAGE_OFF' | 'FIXED_AMOUNT_OFF';
    target: 'ORDER' | 'ELIGIBLE_LINES';
    effectValue: string;
    amount: string;
  }>;
  appliedCoupon?: { couponId: string; code: string; promotionId: string; amount: string };
};

export type PricingCalculationResult = {
  calculatedAt: Date;
  calculated: PricingCalculationBreakdown;
  final: PricingCalculationBreakdown;
  targetTotalAdjustment?: {
    targetTotal: string;
    previousTotal: string;
    direction: 'INCREASE' | 'DECREASE' | 'NONE';
    adjustmentTotal: string;
  };
};

export type PricingCalculationErrorCode =
  | 'pricing_calculation.invalid_request'
  | 'pricing_calculation.coupon_not_applicable'
  | 'pricing_calculation.configuration_unpriceable';

export class PricingCalculationError extends Error {
  constructor(
    readonly code: PricingCalculationErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export abstract class PricingCalculation {
  abstract calculateProposedPrice(
    input: PricingCalculationRequest,
  ): Promise<Result<PricingCalculationResult, PricingCalculationError>>;
}
