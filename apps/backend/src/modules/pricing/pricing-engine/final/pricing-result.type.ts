import { LineTargetTotalAllocation } from '../../features/price-draft-rental/manual-adjustments/manual-pricing-adjustment.types';
import { BasePricingResult, BasePricingResultLine } from '../base/base-pricing-result.type';
import { PricingAdjustmentType, PromotionActivation, PromotionEffectType } from '../promotions/promotion.types';

export type PricingResult = Omit<BasePricingResult, 'lines'> & {
  lines: PricingResultLine[];
  appliedPromotions: AppliedPromotionSnapshot[];
  appliedCoupon?: AppliedCouponSnapshot;
};

export type PricingResultLine = BasePricingResultLine & {
  appliedAdjustments: PricingLineAdjustmentSnapshot[];
  targetTotalAllocation?: LineTargetTotalAllocation;
};

export type PricingLineAdjustmentSnapshot = {
  type: PricingAdjustmentType;
  promotionId: string;
  couponId?: string;
  name: string;
  amount: string;
};

export type AppliedPromotionSnapshot = {
  promotionId: string;
  name: string;
  activation: PromotionActivation;
  effectType: PromotionEffectType;
  effectValue: string;
  amount: string;
  affectedLineReferences: string[];
};

export type AppliedCouponSnapshot = {
  couponId: string;
  code: string;
  promotionId: string;
  amount: string;
};
