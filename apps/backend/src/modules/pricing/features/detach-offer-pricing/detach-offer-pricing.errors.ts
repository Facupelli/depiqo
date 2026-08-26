import { ApplicationError } from 'src/core/errors/application-error';

export type DetachOfferPricingErrorCode = 'pricing.rental_offer_pricing_not_found';

export interface DetachOfferPricingError extends ApplicationError {
  code: DetachOfferPricingErrorCode;
}

export function detachOfferPricingError(
  code: DetachOfferPricingErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): DetachOfferPricingError {
  return { code, message, cause, context };
}
