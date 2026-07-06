import { DomainError } from 'src/core/exceptions/domain.error';

export class PricingError extends DomainError {}

export class InvalidPricingInputError extends PricingError {
  readonly code = 'INVALID_PRICING_INPUT';

  constructor(message: string) {
    super(message);
  }
}

export class MissingRatePlanTierError extends PricingError {
  readonly code = 'MISSING_RATE_PLAN_TIER';

  constructor(params: { ratePlanId: string; chargedUnits: number }) {
    super(
      `No matching rate plan tier found for rate plan "${params.ratePlanId}" and charged units "${params.chargedUnits}".`,
    );
  }
}

export class AmbiguousRatePlanTierError extends PricingError {
  readonly code = 'AMBIGUOUS_RATE_PLAN_TIER';

  constructor(params: { ratePlanId: string; chargedUnits: number; matchingTierIds: string[] }) {
    super(
      `Multiple rate plan tiers matched rate plan "${params.ratePlanId}" and charged units "${params.chargedUnits}": ${params.matchingTierIds.join(
        ', ',
      )}.`,
    );
  }
}

export class MixedCurrencyError extends PricingError {
  readonly code = 'MIXED_CURRENCY';

  constructor(params: { currencies: string[] }) {
    super(`A rental order cannot be priced with multiple currencies: ${params.currencies.join(', ')}.`);
  }
}

export class InvalidPromotionError extends PricingError {
  readonly code = 'INVALID_PROMOTION';

  constructor(message: string) {
    super(message);
  }
}

export class InvalidCouponError extends PricingError {
  readonly code = 'INVALID_COUPON';

  constructor(message: string) {
    super(message);
  }
}

export class CouponNotApplicableError extends PricingError {
  readonly code = 'COUPON_NOT_APPLICABLE';

  constructor(message: string) {
    super(message);
  }
}
