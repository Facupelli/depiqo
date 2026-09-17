import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type ApproveSubmittedCustomerOnboardingErrorCode =
  | 'tenant_management.rental_customer_not_found'
  | 'tenant_management.customer_profile_not_found'
  | 'tenant_management.customer_onboarding_not_pending';

export interface ApproveSubmittedCustomerOnboardingError extends ApplicationError {
  code: ApproveSubmittedCustomerOnboardingErrorCode;
}

export function approveSubmittedCustomerOnboardingError(
  code: ApproveSubmittedCustomerOnboardingErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): ApproveSubmittedCustomerOnboardingError {
  return { code, message, cause, context };
}
