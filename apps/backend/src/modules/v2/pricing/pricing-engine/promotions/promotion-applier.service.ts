import { EligiblePromotion } from './promotion-elegibility.type';
import { PricingAdjustmentType } from './promotion.types';
import { Money } from '../money/money.value-object';
import { DiscountAllocationService } from '../money/discount-allocation.service';
import { PricingContext } from '../final/pricing-context.types';
import { PromotionDiscountCalculator } from './promotion-discount-calculator';

type PromotionApplierInput = {
  context: PricingContext;
  eligiblePromotion: EligiblePromotion;
  adjustmentType: PricingAdjustmentType;
  couponId?: string;
};

export class PromotionApplierService {
  constructor(
    private readonly discountCalculator = new PromotionDiscountCalculator(),
    private readonly allocationService = new DiscountAllocationService(),
  ) {}

  apply(input: PromotionApplierInput): Money {
    const { context, eligiblePromotion, adjustmentType, couponId } = input;
    const { promotion, eligibleLines } = eligiblePromotion;

    const discount = this.discountCalculator.calculateDiscount({
      context,
      eligiblePromotion,
    });

    if (discount.isZero()) {
      return Money.zero(context.currency);
    }

    const allocations = this.allocationService.allocate({
      discount,
      target: promotion.target,
      allLines: context.lines,
      eligibleLines,
    });

    if (allocations.length === 0) {
      return Money.zero(context.currency);
    }

    for (const allocation of allocations) {
      const { line, amount } = allocation;

      line.discountTotal = line.discountTotal.add(amount);
      line.total = line.total.subtract(amount);

      line.appliedAdjustments.push({
        type: adjustmentType,
        promotionId: promotion.id,
        couponId,
        name: promotion.name,
        amount,
      });
    }

    const appliedDiscount = allocations.reduce(
      (total, allocation) => total.add(allocation.amount),
      Money.zero(context.currency),
    );

    context.discountTotal = context.discountTotal.add(appliedDiscount);
    context.total = context.subtotal.subtract(context.discountTotal);

    return appliedDiscount;
  }
}
