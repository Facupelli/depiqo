import { BasePricingInput } from '../../pricing-engine/base/base-pricing-input.type';
import { PromotionPricingInput } from '../../pricing-engine/promotions/promotion-input.types';
import { CouponPricingInput } from '../../pricing-engine/coupons/coupon-input.types';
import { ManualPricingAdjustmentInput } from './manual-adjustments/manual-pricing-adjustment.types';

export type PriceDraftRentalSelectionInput = Omit<BasePricingInput['selections'][number], 'ratePlan'>;

export type PriceDraftRentalInput = Pick<
  BasePricingInput,
  'tenantId' | 'branchId' | 'rentalPeriod' | 'pricingConfig'
> & {
  selections: PriceDraftRentalSelectionInput[];
  customerId?: string;
  calculationDate?: Date;
  automaticPromotions?: PromotionPricingInput[];
  couponCode?: string;
  coupon?: CouponPricingInput;
  manualPricingAdjustment?: ManualPricingAdjustmentInput;
};
