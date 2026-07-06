export type SubmitCustomerProfileApplicationErrorCode =
  | 'CustomerNotFound'
  | 'CustomerProfileAlreadyPending'
  | 'CustomerProfileAlreadyApproved'
  | 'Unexpected';

export interface SubmitCustomerProfileApplicationError {
  code: SubmitCustomerProfileApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function submitCustomerProfileApplicationError(
  code: SubmitCustomerProfileApplicationErrorCode,
  message: string,
  cause?: unknown,
): SubmitCustomerProfileApplicationError {
  return { code, message, cause };
}
