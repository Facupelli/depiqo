export type ApproveSubmittedCustomerOnboardingApplicationErrorCode =
  | 'RentalCustomerNotFound'
  | 'CustomerProfileNotFound'
  | 'CustomerOnboardingNotPending'
  | 'Unexpected';

export interface ApproveSubmittedCustomerOnboardingApplicationError {
  code: ApproveSubmittedCustomerOnboardingApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function approveSubmittedCustomerOnboardingApplicationError(
  code: ApproveSubmittedCustomerOnboardingApplicationErrorCode,
  message: string,
  cause?: unknown,
): ApproveSubmittedCustomerOnboardingApplicationError {
  return { code, message, cause };
}
