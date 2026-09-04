import { ApplicationError } from 'src/core/errors/application-error';

export type ChangeRentalDetailsErrorCode =
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_version_conflict'
  | 'rental_commitment.rental_cannot_be_edited_from_status'
  | 'rental_commitment.rental_period_ended'
  | 'rental_commitment.invalid_rental_field'
  | 'rental_commitment.invalid_pricing_input';

export interface ChangeRentalDetailsError extends ApplicationError {
  code: ChangeRentalDetailsErrorCode;
}

export const changeRentalDetailsError = (
  code: ChangeRentalDetailsErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): ChangeRentalDetailsError => ({ code, message, cause, context });
