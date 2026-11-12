import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

import {
  RentalCannotBeEditedFromStatusError,
  RentalInvalidFieldError,
  RentalPeriodCannotStartInPastError,
  RentalPeriodHasStartedError,
} from '../../domain/errors/rental-commitment.errors';

export type RescheduleConfirmedRentalPeriodErrorCode =
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_version_conflict'
  | 'rental_commitment.rental_cannot_be_edited_from_status'
  | 'rental_commitment.rental_period_has_started'
  | 'rental_commitment.rental_period_must_start_in_future'
  | 'rental_commitment.invalid_rental_period'
  | 'rental_commitment.assigned_assets_unavailable'
  | 'rental_commitment.delivery_evaluation_unavailable'
  | 'rental_commitment.delivery_technical_failure'
  | 'rental_commitment.delivery_review_required'
  | 'rental_commitment.delivery_exception_authorization_required'
  | 'rental_commitment.delivery_exception_permission_denied'
  | 'rental_commitment.invalid_rescheduling_delivery_input';

export interface RescheduleConfirmedRentalPeriodError extends ApplicationError {
  code: RescheduleConfirmedRentalPeriodErrorCode;
}

export const rescheduleConfirmedRentalPeriodError = (
  code: RescheduleConfirmedRentalPeriodErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): RescheduleConfirmedRentalPeriodError => ({ code, message, cause, context });

export function mapRescheduleConfirmedRentalPeriodError(
  error: unknown,
  context?: ApplicationErrorContext,
): RescheduleConfirmedRentalPeriodError {
  if (error instanceof RentalCannotBeEditedFromStatusError) {
    return rescheduleConfirmedRentalPeriodError(
      'rental_commitment.rental_cannot_be_edited_from_status',
      error.message,
      error,
      context,
    );
  }
  if (error instanceof RentalPeriodHasStartedError) {
    return rescheduleConfirmedRentalPeriodError(
      'rental_commitment.rental_period_has_started',
      error.message,
      error,
      context,
    );
  }
  if (error instanceof RentalPeriodCannotStartInPastError) {
    return rescheduleConfirmedRentalPeriodError(
      'rental_commitment.rental_period_must_start_in_future',
      error.message,
      error,
      context,
    );
  }
  if (error instanceof RentalInvalidFieldError) {
    return rescheduleConfirmedRentalPeriodError(
      'rental_commitment.invalid_rescheduling_delivery_input',
      error.message,
      error,
      context,
    );
  }
  throw error;
}
