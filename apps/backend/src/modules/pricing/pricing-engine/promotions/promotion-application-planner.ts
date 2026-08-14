import { EligiblePromotion } from './promotion-elegibility.type';

export class PromotionApplicationPlanner {
  plan(input: { eligiblePromotions: EligiblePromotion[] }): EligiblePromotion[] {
    const sortedPromotions = [...input.eligiblePromotions].sort((a, b) => b.promotion.priority - a.promotion.priority);

    const plannedPromotions: EligiblePromotion[] = [];

    for (const eligiblePromotion of sortedPromotions) {
      plannedPromotions.push(eligiblePromotion);

      if (!eligiblePromotion.promotion.stackable) {
        break;
      }
    }

    return plannedPromotions;
  }
}
