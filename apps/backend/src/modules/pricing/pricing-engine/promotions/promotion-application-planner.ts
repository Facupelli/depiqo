import { EligiblePromotion } from './promotion-elegibility.type';

export class PromotionApplicationPlanner {
  plan(input: { eligiblePromotions: EligiblePromotion[] }): EligiblePromotion[] {
    return [...input.eligiblePromotions].sort((a, b) => b.promotion.priority - a.promotion.priority);
  }
}
