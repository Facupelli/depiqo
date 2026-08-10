import { ApplicationError } from 'src/core/errors/application-error';

export type AssignCustomerToDraftRentalErrorCode =
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_must_be_draft'
  | 'rental_commitment.rental_version_conflict'
  | 'rental_commitment.customer_not_found_or_outside_tenant'
  | 'rental_commitment.customer_deleted'
  | 'rental_commitment.customer_inactive'
  | 'rental_commitment.invalid_customer';

export interface AssignCustomerToDraftRentalError extends ApplicationError {
  code: AssignCustomerToDraftRentalErrorCode;
}

export function assignCustomerToDraftRentalError(
  code: AssignCustomerToDraftRentalErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): AssignCustomerToDraftRentalError {
  return { code, message, cause, context };
}
