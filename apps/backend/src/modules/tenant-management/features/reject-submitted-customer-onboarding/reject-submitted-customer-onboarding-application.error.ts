export type RejectSubmittedCustomerOnboardingApplicationErrorCode =
  | 'RentalCustomerNotFound'
  | 'CustomerProfileNotFound'
  | 'CustomerOnboardingNotPending'
  | 'Unexpected';

export interface RejectSubmittedCustomerOnboardingApplicationError {
  code: RejectSubmittedCustomerOnboardingApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function rejectSubmittedCustomerOnboardingApplicationError(
  code: RejectSubmittedCustomerOnboardingApplicationErrorCode,
  message: string,
  cause?: unknown,
): RejectSubmittedCustomerOnboardingApplicationError {
  return { code, message, cause };
}
