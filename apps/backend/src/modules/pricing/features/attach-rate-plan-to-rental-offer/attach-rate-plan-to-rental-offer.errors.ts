import { ApplicationError } from 'src/core/errors/application-error';

export type AttachRatePlanToRentalOfferErrorCode =
  | 'pricing.rental_offer_not_found'
  | 'pricing.rate_plan_not_found'
  | 'pricing.rate_plan_inactive';

export interface AttachRatePlanToRentalOfferError extends ApplicationError {
  code: AttachRatePlanToRentalOfferErrorCode;
}

export function attachRatePlanToRentalOfferError(
  code: AttachRatePlanToRentalOfferErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): AttachRatePlanToRentalOfferError {
  return { code, message, cause, context };
}
