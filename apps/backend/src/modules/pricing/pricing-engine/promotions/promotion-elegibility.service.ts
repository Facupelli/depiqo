import { InvalidPromotionError } from '../errors/pricing.errors';
import { EligiblePromotion } from './promotion-elegibility.type';
import { PromotionPricingInput } from './promotion-input.types';
import { PromotionActivation } from './promotion.types';
import { Money } from '../money/money.value-object';
import { ValidityWindowChecker } from '../shared/validity-window-checker';
import { PricingContext } from '../final/pricing-context.types';
import { PromotionScopeMatcher } from './promotion-scope-matcher';

type PromotionEligibilityServiceInput = {
  context: PricingContext;
  promotions: PromotionPricingInput[];
  activation: PromotionActivation;
};

export class PromotionEligibilityService {
  constructor(
    private readonly scopeMatcher = new PromotionScopeMatcher(),
    private readonly validityWindowChecker = new ValidityWindowChecker(),
  ) {}

  getEligiblePromotions(input: PromotionEligibilityServiceInput): EligiblePromotion[] {
    const { context, promotions, activation } = input;

    return promotions.flatMap((promotion) => {
      this.validatePromotion(promotion);

      if (!this.isPromotionBasicallyEligible({ context, promotion, activation })) {
        return [];
      }

      const eligibleLines = this.scopeMatcher.getEligibleLines({
        lines: context.lines,
        scopes: promotion.scopes,
        exclusions: promotion.exclusions,
      });

      if (eligibleLines.length === 0 || !this.meetsLineDependentConditions({ context, promotion, eligibleLines })) {
        return [];
      }

      return [
        {
          promotion,
          eligibleLines,
        },
      ];
    });
  }

  private isPromotionBasicallyEligible(input: {
    context: PricingContext;
    promotion: PromotionPricingInput;
    activation: PromotionActivation;
  }): boolean {
    const { context, promotion, activation } = input;

    if (promotion.tenantId !== context.tenantId) {
      return false;
    }

    if (!promotion.isActive) {
      return false;
    }

    if (promotion.activation !== activation) {
      return false;
    }

    if (
      !this.validityWindowChecker.isWithinWindow({
        localDate: context.calculationLocalDate,
        validFrom: promotion.validFrom,
        validUntil: promotion.validUntil,
      })
    ) {
      return false;
    }

    return true;
  }

  private meetsLineDependentConditions(input: {
    context: PricingContext;
    promotion: PromotionPricingInput;
    eligibleLines: EligiblePromotion['eligibleLines'];
  }): boolean {
    const { context, promotion, eligibleLines } = input;

    if (promotion.minOrderSubtotal != null) {
      const minOrderSubtotal = Money.of(promotion.minOrderSubtotal, context.currency);
      const eligibleSubtotal = eligibleLines.reduce(
        (total, line) => total.add(line.subtotal),
        Money.zero(context.currency),
      );

      if (!eligibleSubtotal.isGreaterThan(minOrderSubtotal) && !eligibleSubtotal.equals(minOrderSubtotal)) {
        return false;
      }
    }

    const maxChargedUnits = Math.max(...eligibleLines.map((line) => line.chargedUnits));

    if (promotion.minRentalUnits != null && maxChargedUnits < promotion.minRentalUnits) {
      return false;
    }

    if (promotion.maxRentalUnits != null && maxChargedUnits > promotion.maxRentalUnits) {
      return false;
    }

    return true;
  }

  private validatePromotion(promotion: PromotionPricingInput): void {
    if (!promotion.id.trim()) {
      throw new InvalidPromotionError('Promotion id is required.');
    }

    if (!promotion.tenantId.trim()) {
      throw new InvalidPromotionError(`Tenant id is required for promotion "${promotion.id}".`);
    }

    if (!promotion.name.trim()) {
      throw new InvalidPromotionError(`Promotion name is required for promotion "${promotion.id}".`);
    }

    if (!Number.isInteger(promotion.priority)) {
      throw new InvalidPromotionError(`Promotion "${promotion.id}" priority must be an integer.`);
    }

    if (!promotion.effectValue.trim()) {
      throw new InvalidPromotionError(`Promotion "${promotion.id}" effect value is required.`);
    }

    if (promotion.scopes.length === 0) {
      throw new InvalidPromotionError(`Promotion "${promotion.id}" must have at least one scope.`);
    }
  }
}
