import { ApplicationError } from 'src/core/errors/application-error';

export type CancelRentalErrorCode =
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_already_cancelled'
  | 'rental_commitment.rental_cannot_be_cancelled_from_status'
  | 'rental_commitment.rental_version_conflict';

export interface CancelRentalError extends ApplicationError {
  code: CancelRentalErrorCode;
}

export function cancelRentalError(
  code: CancelRentalErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CancelRentalError {
  return { code, message, cause, context };
}
