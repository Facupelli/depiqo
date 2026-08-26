import { ApplicationError } from 'src/core/errors/application-error';

export type ChangeRentalPeriodErrorCode =
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_cannot_be_edited_from_status'
  | 'rental_commitment.rental_period_ended'
  | 'rental_commitment.rental_version_conflict'
  | 'rental_commitment.invalid_rental_period'
  | 'rental_commitment.insufficient_asset_availability'
  | 'rental_commitment.invalid_pricing_input'
  | 'rental_commitment.invalid_rental_field';

export interface ChangeRentalPeriodError extends ApplicationError {
  code: ChangeRentalPeriodErrorCode;
}

export const changeRentalPeriodError = (
  code: ChangeRentalPeriodErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): ChangeRentalPeriodError => ({ code, message, cause, context });
