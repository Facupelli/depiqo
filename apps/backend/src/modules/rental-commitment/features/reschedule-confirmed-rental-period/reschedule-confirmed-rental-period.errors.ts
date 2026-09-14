import { ApplicationError } from 'src/core/errors/application-error';

export type RescheduleConfirmedRentalPeriodErrorCode =
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_version_conflict'
  | 'rental_commitment.rental_cannot_be_edited_from_status'
  | 'rental_commitment.rental_period_has_started'
  | 'rental_commitment.rental_period_must_start_in_future'
  | 'rental_commitment.invalid_rental_period'
  | 'rental_commitment.assigned_assets_unavailable';

export interface RescheduleConfirmedRentalPeriodError extends ApplicationError {
  code: RescheduleConfirmedRentalPeriodErrorCode;
}

export const rescheduleConfirmedRentalPeriodError = (
  code: RescheduleConfirmedRentalPeriodErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): RescheduleConfirmedRentalPeriodError => ({ code, message, cause, context });
