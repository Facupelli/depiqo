import { EligiblePromotion } from './promotion-elegibility.type';

export class PromotionApplicationPlanner {
  plan(input: { eligiblePromotions: EligiblePromotion[] }): EligiblePromotion[] {
    // Non-stackability depends on a positive payable effect, which can only be
    // established after higher-priority promotions have changed the lines.
    return [...input.eligiblePromotions].sort((a, b) => b.promotion.priority - a.promotion.priority);
  }
}
