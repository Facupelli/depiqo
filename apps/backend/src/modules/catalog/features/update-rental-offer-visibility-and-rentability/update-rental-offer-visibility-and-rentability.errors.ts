import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type UpdateRentalOfferVisibilityAndRentabilityErrorCode =
  | 'catalog.rental_offer_not_found'
  | 'catalog.rental_offer_archived';

export interface UpdateRentalOfferVisibilityAndRentabilityError extends ApplicationError {
  code: UpdateRentalOfferVisibilityAndRentabilityErrorCode;
}

export function updateRentalOfferVisibilityAndRentabilityError(
  code: UpdateRentalOfferVisibilityAndRentabilityErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): UpdateRentalOfferVisibilityAndRentabilityError {
  return { code, message, cause, context };
}
