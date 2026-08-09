import { ApplicationError } from 'src/core/errors/application-error';

export type GetRentalOfferAvailabilityErrorCode =
  | 'rental_commitment.rental_offer_not_found'
  | 'rental_commitment.rental_offer_not_rentable'
  | 'rental_commitment.rentable_item_not_active'
  | 'rental_commitment.invalid_fulfillment_definition'
  | 'rental_commitment.invalid_candidate_projection';

export interface GetRentalOfferAvailabilityError extends ApplicationError {
  code: GetRentalOfferAvailabilityErrorCode;
}

export function getRentalOfferAvailabilityError(
  code: GetRentalOfferAvailabilityErrorCode,
  message: string,
  cause?: unknown,
): GetRentalOfferAvailabilityError {
  return { code, message, cause };
}
