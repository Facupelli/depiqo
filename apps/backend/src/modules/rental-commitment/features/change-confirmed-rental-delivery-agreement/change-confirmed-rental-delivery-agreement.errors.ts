import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type ChangeConfirmedRentalDeliveryAgreementErrorCode =
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_version_conflict'
  | 'rental_commitment.rental_cannot_be_edited_from_status'
  | 'rental_commitment.rental_period_ended'
  | 'rental_commitment.invalid_rental_field';

export interface ChangeConfirmedRentalDeliveryAgreementError extends ApplicationError {
  code: ChangeConfirmedRentalDeliveryAgreementErrorCode;
}

export const changeConfirmedRentalDeliveryAgreementError = (
  code: ChangeConfirmedRentalDeliveryAgreementErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): ChangeConfirmedRentalDeliveryAgreementError => ({ code, message, cause, context });
