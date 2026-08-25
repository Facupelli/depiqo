import { DailyBillingPolicy } from '../pricing-engine/shared/daily-billing-unit-policy.type';

export const PRICING_DURATION_DEFAULTS = {
  minimumChargedDays: 1,
  quarterDayThresholdMinutes: 360,
  halfDayThresholdMinutes: 720,
} as const;

export function createPricingDurationPolicy(input: {
  effectiveTimezone: string;
  dailyBillingPolicy: DailyBillingPolicy;
  weekendCountsAsOne: boolean;
}): {
  timezone: string;
  dailyBillingPolicy: DailyBillingPolicy;
  weekendCountsAsOne: boolean;
  minimumChargedDays: number;
  quarterDayThresholdMinutes: number;
  halfDayThresholdMinutes: number;
} {
  return {
    timezone: input.effectiveTimezone,
    dailyBillingPolicy: input.dailyBillingPolicy,
    weekendCountsAsOne: input.weekendCountsAsOne,
    ...PRICING_DURATION_DEFAULTS,
  };
}
