import Decimal from 'decimal.js';
import { EligiblePromotion } from './promotion-elegibility.type';
import { Money } from '../money/money.value-object';
import { InvalidPromotionError } from '../errors/pricing.errors';
import { PricingContext } from '../final/pricing-context.types';

export class PromotionDiscountCalculator {
  calculateDiscount(input: { context: PricingContext; eligiblePromotion: EligiblePromotion }): Money {
    const { context, eligiblePromotion } = input;
    const { promotion, eligibleLines } = eligiblePromotion;

    const discountableSubtotal = eligibleLines.reduce(
      (total, line) => total.add(line.total),
      Money.zero(context.currency),
    );

    if (discountableSubtotal.isZero()) {
      return Money.zero(context.currency);
    }

    switch (promotion.effectType) {
      case 'PERCENTAGE_OFF':
        return this.calculatePercentageDiscount({
          subtotal: discountableSubtotal,
          percentage: promotion.effectValue,
        });

      case 'FIXED_AMOUNT_OFF':
        return this.calculateFixedDiscount({
          subtotal: discountableSubtotal,
          amount: promotion.effectValue,
          currency: context.currency,
        });

      default:
        return this.assertNever(promotion.effectType);
    }
  }

  private calculatePercentageDiscount(input: { subtotal: Money; percentage: string }): Money {
    const percentage = new Decimal(input.percentage);

    if (!percentage.isFinite() || percentage.lessThanOrEqualTo(0) || percentage.greaterThan(100)) {
      throw new InvalidPromotionError(
        `Percentage promotion effect must be greater than 0 and less than or equal to 100. Received "${input.percentage}".`,
      );
    }

    return Money.of(input.subtotal.toDecimal().mul(percentage).div(100), input.subtotal.currency);
  }

  private calculateFixedDiscount(input: { subtotal: Money; amount: string; currency: string }): Money {
    const fixedAmount = Money.of(input.amount, input.currency);

    if (fixedAmount.isGreaterThan(input.subtotal)) {
      return input.subtotal;
    }

    return fixedAmount;
  }

  private assertNever(value: never): never {
    throw new InvalidPromotionError(`Unsupported promotion effect type: ${String(value)}.`);
  }
}
