export type AssignCustomerToDraftRentalApplicationErrorCode =
  | 'RentalNotFound'
  | 'RentalMustBeDraft'
  | 'CustomerNotFoundOrNotAssignable'
  | 'Unexpected';

export interface AssignCustomerToDraftRentalApplicationError {
  code: AssignCustomerToDraftRentalApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function assignCustomerToDraftRentalApplicationError(
  code: AssignCustomerToDraftRentalApplicationErrorCode,
  message: string,
  cause?: unknown,
): AssignCustomerToDraftRentalApplicationError {
  return { code, message, cause };
}
