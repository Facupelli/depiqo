import { BasePricingInput } from '../base/base-pricing-input.type';
import { CouponPricingInput } from '../coupons/coupon-input.types';
import { PromotionPricingInput } from '../promotions/promotion-input.types';

export type PricingInput = BasePricingInput & {
  customerId?: string;
  calculationDate: Date;
  automaticPromotions: PromotionPricingInput[];
  couponCode?: string;
  coupon?: CouponPricingInput;
};
