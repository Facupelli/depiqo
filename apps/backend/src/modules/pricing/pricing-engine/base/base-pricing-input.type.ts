import { BillingUnit } from '../shared/billing-unit.type';
import { DailyBillingPolicy } from '../shared/daily-billing-unit-policy.type';

export type BasePricingInput = {
  tenantId: string;
  rentalPeriod: {
    start: Date;
    end: Date;
  };
  pricingConfig: {
    timezone: string;
    dailyBillingPolicy: DailyBillingPolicy;
    weekendCountsAsOne: boolean;
    minimumChargedDays: number;
    quarterDayThresholdMinutes?: number;
    halfDayThresholdMinutes?: number;
  };
  selections: BasePricingSelectionInput[];
};

export type BasePricingSelectionInput = {
  rentalSelectionId: string;
  rentalOfferId: string;
  rentableItemId: string;
  rentableItemName: string;
  pricingLineKind: 'PRICEABLE_LINE';
  rentableItemKind: 'SINGLE' | 'PACKAGE' | 'KIT' | 'BUNDLE';
  categoryId?: string;
  quantity: number;
  ratePlan: BasePricingRatePlanInput;
};

export type BasePricingRatePlanInput = {
  id: string;
  billingUnit: BillingUnit;
  currency: string;
  tiers: BasePricingRatePlanTierInput[];
};

export type BasePricingRatePlanTierInput = {
  id: string;
  fromUnit: number;
  toUnit: number | null;
  pricePerUnit: string;
};
