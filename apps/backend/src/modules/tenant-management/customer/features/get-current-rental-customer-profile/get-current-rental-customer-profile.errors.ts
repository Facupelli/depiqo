import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type GetCurrentRentalCustomerProfileErrorCode =
  | 'tenant_management.rental_customer_not_found'
  | 'tenant_management.customer_profile_not_found';

export interface GetCurrentRentalCustomerProfileError extends ApplicationError {
  code: GetCurrentRentalCustomerProfileErrorCode;
}

export function getCurrentRentalCustomerProfileError(
  code: GetCurrentRentalCustomerProfileErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): GetCurrentRentalCustomerProfileError {
  return { code, message, cause, context };
}
