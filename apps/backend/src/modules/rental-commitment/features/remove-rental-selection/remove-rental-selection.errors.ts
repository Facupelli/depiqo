import { ApplicationError } from 'src/core/errors/application-error';

export type RemoveRentalSelectionErrorCode =
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_selection_not_found'
  | 'rental_commitment.rental_cannot_be_edited_from_status'
  | 'rental_commitment.rental_requires_selection'
  | 'rental_commitment.rental_period_ended'
  | 'rental_commitment.rental_selection_referenced_by_accessory'
  | 'rental_commitment.invalid_pricing_input'
  | 'rental_commitment.rental_version_conflict'
  | 'rental_commitment.invalid_rental_field';

export interface RemoveRentalSelectionError extends ApplicationError {
  code: RemoveRentalSelectionErrorCode;
}

export const removeRentalSelectionError = (
  code: RemoveRentalSelectionErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): RemoveRentalSelectionError => ({ code, message, cause, context });
