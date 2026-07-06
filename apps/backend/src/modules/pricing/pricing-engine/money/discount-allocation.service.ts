import { PricingContextLine } from '../final/pricing-context.types';
import { PromotionApplicationTarget } from '../promotions/promotion.types';
import { Money } from './money.value-object';

export type DiscountAllocation = {
  line: PricingContextLine;
  amount: Money;
};

type DiscountAllocationServiceInput = {
  discount: Money;
  target: PromotionApplicationTarget;
  allLines: PricingContextLine[];
  eligibleLines: PricingContextLine[];
};

export class DiscountAllocationService {
  allocate(input: DiscountAllocationServiceInput): DiscountAllocation[] {
    const discountableLines = this.resolveDiscountableLines(input);

    if (discountableLines.length === 0 || input.discount.isZero()) {
      return [];
    }

    const nonZeroLines = discountableLines.filter((line) => !line.total.isZero());

    if (nonZeroLines.length === 0) {
      return [];
    }

    const discountableTotal = nonZeroLines.reduce(
      (total, line) => total.add(line.total),
      Money.zero(input.discount.currency),
    );

    const clampedDiscount = input.discount.isGreaterThan(discountableTotal) ? discountableTotal : input.discount;

    const ratios = nonZeroLines.map((line) => this.toAllocationRatio(line.total));

    const allocatedAmounts = clampedDiscount.allocateByRatios(ratios);

    return nonZeroLines.map((line, index) => ({
      line,
      amount: allocatedAmounts[index],
    }));
  }

  private resolveDiscountableLines(input: DiscountAllocationServiceInput): PricingContextLine[] {
    if (input.target === 'ORDER') {
      return input.allLines;
    }

    return input.eligibleLines;
  }

  private toAllocationRatio(amount: Money): number {
    const cents = amount.toDecimal().mul(100).floor().toNumber();

    if (!Number.isSafeInteger(cents)) {
      throw new Error(`Money amount is too large to be used as an allocation ratio: ${amount.toString()}`);
    }

    return cents;
  }
}
