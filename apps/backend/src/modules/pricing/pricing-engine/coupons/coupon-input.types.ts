import type { LocalDate } from '@repo/api-contracts';

import { PromotionPricingInput } from '../promotions/promotion-input.types';

export type CouponPricingInput = {
  id: string;
  tenantId: string;
  promotionId: string;
  code: string;
  isActive: boolean;
  validFrom?: LocalDate | null;
  validUntil?: LocalDate | null;
  maxUses?: number | null;
  maxUsesPerCustomer?: number | null;
  restrictedToCustomerId?: string | null;
  currentTotalRedemptions: number;
  currentCustomerRedemptions?: number;
  promotion: PromotionPricingInput;
};
