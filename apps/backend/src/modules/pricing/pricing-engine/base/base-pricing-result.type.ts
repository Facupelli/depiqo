import { BillingUnit } from '../shared/billing-unit.type';
import { DailyBillingPolicy } from '../shared/daily-billing-unit-policy.type';

export type BasePricingResult = {
  currency: string;
  subtotal: string;
  discountTotal: string;
  total: string;
  chargedDays: number;
  lines: BasePricingResultLine[];
  durationPolicySnapshot: DurationPolicySnapshot;
};

export type BasePricingResultLine = {
  rentalSelectionId: string;
  rentalOfferId: string;
  rentableItemId: string;
  rentableItemName: string;
  categoryId?: string;
  quantity: number;
  chargedUnits: number;
  billingUnit: BillingUnit;
  ratePlanId: string;
  appliedTierId: string;
  pricePerUnit: string;
  subtotal: string;
  discountTotal: string;
  total: string;
};

export type DurationPolicySnapshot = {
  timezone: string;
  dailyBillingPolicy: DailyBillingPolicy;
  weekendCountsAsOne: boolean;
  minimumChargedDays: number;
  quarterDayThresholdMinutes?: number;
  halfDayThresholdMinutes?: number;
};
