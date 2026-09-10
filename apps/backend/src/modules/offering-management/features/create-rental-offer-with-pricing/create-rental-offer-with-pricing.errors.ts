import { ApplicationError } from 'src/core/errors/application-error';

export type CreateRentalOfferWithPricingErrorCode =
  | 'offering_setup.tenant_unavailable'
  | 'offering_setup.branch_unavailable'
  | 'offering_setup.invalid_rental_offer'
  | 'offering_setup.rentable_item_not_found'
  | 'offering_setup.rentable_item_archived'
  | 'offering_setup.rental_offer_already_exists'
  | 'offering_setup.rate_plan_not_found'
  | 'offering_setup.rate_plan_inactive'
  | 'offering_setup.rate_plan_name_already_in_use'
  | 'offering_setup.invalid_rate_plan';

export interface CreateRentalOfferWithPricingError extends ApplicationError {
  code: CreateRentalOfferWithPricingErrorCode;
}

export function createRentalOfferWithPricingError(
  code: CreateRentalOfferWithPricingErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CreateRentalOfferWithPricingError {
  return { code, message, cause, context };
}
