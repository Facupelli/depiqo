import type { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';
import {
  AssetBlockPeriodMismatchError,
  RentalCannotBeEditedFromStatusError,
  RentalCommitmentError,
  RentalInvalidFieldError,
  RentalPeriodHasStartedError,
} from '../../domain/errors/rental-commitment.errors';

export type ChangeConfirmedRentalDeliveryErrorCode =
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_version_conflict'
  | 'rental_commitment.delivery_management_permission_denied'
  | 'rental_commitment.rental_cannot_be_edited_from_status'
  | 'rental_commitment.rental_period_started'
  | 'rental_commitment.invalid_rental_field'
  | 'rental_commitment.delivery_not_serviceable'
  | 'rental_commitment.delivery_evaluation_unavailable'
  | 'rental_commitment.assigned_assets_unavailable'
  | 'rental_commitment.unsafe_delivery_reservation_change';

export interface ChangeConfirmedRentalDeliveryError extends ApplicationError {
  code: ChangeConfirmedRentalDeliveryErrorCode;
}

export function changeConfirmedRentalDeliveryError(
  code: ChangeConfirmedRentalDeliveryErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): ChangeConfirmedRentalDeliveryError {
  return { code, message, cause, context };
}

export function mapChangeConfirmedRentalDeliveryError(
  error: RentalCommitmentError,
  context?: ApplicationErrorContext,
): ChangeConfirmedRentalDeliveryError {
  if (error instanceof RentalCannotBeEditedFromStatusError)
    return changeConfirmedRentalDeliveryError(
      'rental_commitment.rental_cannot_be_edited_from_status',
      error.message,
      error,
      context,
    );
  if (error instanceof RentalPeriodHasStartedError)
    return changeConfirmedRentalDeliveryError('rental_commitment.rental_period_started', error.message, error, context);
  if (error instanceof AssetBlockPeriodMismatchError)
    return changeConfirmedRentalDeliveryError(
      'rental_commitment.unsafe_delivery_reservation_change',
      error.message,
      error,
      context,
    );
  if (error instanceof RentalInvalidFieldError)
    return changeConfirmedRentalDeliveryError(
      error.field === 'assetBlocks'
        ? 'rental_commitment.unsafe_delivery_reservation_change'
        : 'rental_commitment.invalid_rental_field',
      error.message,
      error,
      context,
    );
  throw error;
}
