import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type SubmitCustomerProfileErrorCode =
  | 'tenant_management.rental_customer_not_found'
  | 'tenant_management.customer_profile_already_pending'
  | 'tenant_management.customer_profile_already_approved'
  | 'tenant_management.invalid_customer_identity_document_reference';

export interface SubmitCustomerProfileError extends ApplicationError {
  code: SubmitCustomerProfileErrorCode;
}

export function submitCustomerProfileError(
  code: SubmitCustomerProfileErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): SubmitCustomerProfileError {
  return { code, message, cause, context };
}
