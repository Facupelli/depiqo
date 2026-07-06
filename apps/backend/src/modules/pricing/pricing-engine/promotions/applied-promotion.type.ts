import { Money } from '../money/money.value-object';
import { PromotionPricingInput } from './promotion-input.types';
import { PricingAdjustmentType } from './promotion.types';

export type AppliedPromotion = {
  promotion: PromotionPricingInput;
  adjustmentType: PricingAdjustmentType;
  couponId?: string;
  couponCode?: string;
  amount: Money;
};
