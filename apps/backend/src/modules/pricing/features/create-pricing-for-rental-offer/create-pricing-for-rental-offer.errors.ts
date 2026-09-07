import { ApplicationError } from 'src/core/errors/application-error';

export type CreatePricingForRentalOfferErrorCode =
  | 'pricing.rental_offer_not_found'
  | 'pricing.rate_plan_name_already_in_use'
  | 'pricing.invalid_rate_plan';

export interface CreatePricingForRentalOfferError extends ApplicationError {
  code: CreatePricingForRentalOfferErrorCode;
}

export function createPricingForRentalOfferError(
  code: CreatePricingForRentalOfferErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CreatePricingForRentalOfferError {
  return { code, message, cause, context };
}
