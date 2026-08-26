import { ApplicationError } from 'src/core/errors/application-error';

export type ChangeRentalSelectionQuantityErrorCode =
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_selection_not_found'
  | 'rental_commitment.rental_cannot_be_edited_from_status'
  | 'rental_commitment.rental_period_ended'
  | 'rental_commitment.insufficient_asset_availability'
  | 'rental_commitment.invalid_pricing_input'
  | 'rental_commitment.rental_version_conflict'
  | 'rental_commitment.invalid_rental_field';
export interface ChangeRentalSelectionQuantityError extends ApplicationError {
  code: ChangeRentalSelectionQuantityErrorCode;
}
export const changeRentalSelectionQuantityError = (
  code: ChangeRentalSelectionQuantityErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): ChangeRentalSelectionQuantityError => ({ code, message, cause, context });
