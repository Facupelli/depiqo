import { ApplicationError } from 'src/core/errors/application-error';

export type RejectSubmittedCustomerOnboardingErrorCode =
  | 'tenant_management.rental_customer_not_found'
  | 'tenant_management.customer_profile_not_found'
  | 'tenant_management.customer_onboarding_not_pending';

export interface RejectSubmittedCustomerOnboardingError extends ApplicationError {
  code: RejectSubmittedCustomerOnboardingErrorCode;
}

export function rejectSubmittedCustomerOnboardingError(
  code: RejectSubmittedCustomerOnboardingErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): RejectSubmittedCustomerOnboardingError {
  return { code, message, cause, context };
}
