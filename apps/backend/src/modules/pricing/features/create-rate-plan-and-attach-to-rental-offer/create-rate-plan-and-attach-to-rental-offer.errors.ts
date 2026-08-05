import { ApplicationError } from 'src/core/errors/application-error';

export type CreateRatePlanAndAttachToRentalOfferErrorCode =
  | 'pricing.rental_offer_not_found'
  | 'pricing.rate_plan_name_already_in_use'
  | 'pricing.invalid_rate_plan';

export interface CreateRatePlanAndAttachToRentalOfferError extends ApplicationError {
  code: CreateRatePlanAndAttachToRentalOfferErrorCode;
}

export function createRatePlanAndAttachToRentalOfferError(
  code: CreateRatePlanAndAttachToRentalOfferErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CreateRatePlanAndAttachToRentalOfferError {
  return { code, message, cause, context };
}
