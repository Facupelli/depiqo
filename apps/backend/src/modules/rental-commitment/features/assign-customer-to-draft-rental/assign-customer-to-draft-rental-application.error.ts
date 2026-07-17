import { ApplicationError } from 'src/core/errors/application-error';

export type AssignCustomerToDraftRentalApplicationErrorCode =
  | 'rental-commitment.rental-not-found'
  | 'rental-commitment.rental-must-be-draft'
  | 'rental-commitment.customer-not-found-or-outside-tenant'
  | 'rental-commitment.customer-deleted'
  | 'rental-commitment.customer-inactive'
  | 'rental-commitment.invalid-customer';

export interface AssignCustomerToDraftRentalApplicationError extends ApplicationError {
  code: AssignCustomerToDraftRentalApplicationErrorCode;
}

export function assignCustomerToDraftRentalApplicationError(
  code: AssignCustomerToDraftRentalApplicationErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): AssignCustomerToDraftRentalApplicationError {
  return { code, message, cause, context };
}
