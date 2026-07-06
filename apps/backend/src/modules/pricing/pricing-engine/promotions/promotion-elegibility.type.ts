import { PricingContextLine } from '../final/pricing-context.types';
import { PromotionPricingInput } from './promotion-input.types';

export type EligiblePromotion = {
  promotion: PromotionPricingInput;
  eligibleLines: PricingContextLine[];
};
