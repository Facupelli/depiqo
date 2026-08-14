import { ApplicationError } from 'src/core/errors/application-error';

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
  context?: Record<string, unknown>,
): ApproveSubmittedCustomerOnboardingError {
  return { code, message, cause, context };
}
