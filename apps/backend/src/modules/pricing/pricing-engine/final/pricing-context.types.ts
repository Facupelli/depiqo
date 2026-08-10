import type { LocalDate } from '@repo/api-contracts';

import { Money } from '../money/money.value-object';
import { DurationPolicySnapshot } from '../base/base-pricing-result.type';
import { PricingAdjustmentType } from '../promotions/promotion.types';
import { BillingUnit } from '../shared/billing-unit.type';

export type PricingContext = {
  tenantId: string;
  branchId: string;
  customerId?: string;
  currency: string;
  subtotal: Money;
  discountTotal: Money;
  total: Money;
  chargedDays: number;
  calculationDate: Date;
  calculationLocalDate: LocalDate;
  durationPolicySnapshot: DurationPolicySnapshot;
  lines: PricingContextLine[];
};

export type PricingContextLine = {
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
  pricePerUnit: Money;
  subtotal: Money;
  discountTotal: Money;
  total: Money;
  appliedAdjustments: PricingContextLineAdjustment[];
};

export type PricingContextLineAdjustment = {
  type: PricingAdjustmentType;
  promotionId: string;
  couponId?: string;
  name: string;
  amount: Money;
};
