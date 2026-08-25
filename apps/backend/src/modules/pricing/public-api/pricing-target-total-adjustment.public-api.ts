import { Result } from 'neverthrow';

export type PricingTargetTotalAdjustmentDirection = 'INCREASE' | 'DECREASE' | 'NONE';

export type PricingTargetTotalAdjustmentRequest = {
  currency: string;
  targetTotal: string;
  lines: Array<{
    lineReference: string;
    currentTotal: string;
  }>;
};

export type PricingTargetTotalAdjustmentResult = {
  currentTotal: string;
  targetTotal: string;
  direction: PricingTargetTotalAdjustmentDirection;
  adjustmentTotal: string;
  lines: Array<{
    lineReference: string;
    previousTotal: string;
    finalTotal: string;
    direction: PricingTargetTotalAdjustmentDirection;
    adjustmentAmount: string;
  }>;
};

export class PricingTargetTotalAdjustmentError extends Error {
  readonly code = 'pricing_target_total_adjustment.invalid_request' as const;
}

export abstract class PricingTargetTotalAdjustment {
  abstract allocate(
    input: PricingTargetTotalAdjustmentRequest,
  ): Result<PricingTargetTotalAdjustmentResult, PricingTargetTotalAdjustmentError>;
}
