import { Result } from 'neverthrow';

export const PRICING_RATE_PLAN_BILLING_UNITS = ['HOUR', 'DAY', 'WEEK'] as const;
export type PricingRatePlanBillingUnit = (typeof PRICING_RATE_PLAN_BILLING_UNITS)[number];

export interface CreatePricingRatePlanInput {
  tenantId: string;
  name: string;
  billingUnit: PricingRatePlanBillingUnit;
  currency: string;
  isActive: boolean;
  tiers: Array<{ fromUnit: number; toUnit?: number | null; pricePerUnit: string }>;
}

export interface CreatePricingRatePlanResult {
  ratePlanId: string;
}

export type PricingRatePlanAuthoringErrorCode = 'RatePlanNameAlreadyInUse' | 'InvalidRatePlan';

export class PricingRatePlanAuthoringError extends Error {
  constructor(
    public readonly code: PricingRatePlanAuthoringErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PricingRatePlanAuthoringError';
  }
}

export abstract class PricingRatePlanAuthoring {
  abstract createRatePlan(
    input: CreatePricingRatePlanInput,
  ): Promise<Result<CreatePricingRatePlanResult, PricingRatePlanAuthoringError>>;
}
