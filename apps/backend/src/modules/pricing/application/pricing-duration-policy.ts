import { DailyBillingPolicy } from '../pricing-engine/shared/daily-billing-unit-policy.type';

export const PRICING_DURATION_DEFAULTS = {
  minimumChargedDays: 1,
  halfDayThresholdMinutes: 720,
} as const;

export function createPricingDurationPolicy(input: {
  effectiveTimezone: string;
  dailyBillingPolicy: DailyBillingPolicy;
}): {
  timezone: string;
  dailyBillingPolicy: DailyBillingPolicy;
  minimumChargedDays: number;
  halfDayThresholdMinutes: number;
} {
  return {
    timezone: input.effectiveTimezone,
    dailyBillingPolicy: input.dailyBillingPolicy,
    ...PRICING_DURATION_DEFAULTS,
  };
}
