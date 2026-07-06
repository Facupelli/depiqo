export type CancelRentalApplicationErrorCode =
  | 'RentalNotFound'
  | 'RentalAlreadyCancelled'
  | 'RentalCannotBeCancelledFromStatus'
  | 'RentalCommitmentUnexpected'
  | 'Unexpected';

export interface CancelRentalApplicationError {
  code: CancelRentalApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function cancelRentalApplicationError(
  code: CancelRentalApplicationErrorCode,
  message: string,
  cause?: unknown,
): CancelRentalApplicationError {
  return { code, message, cause };
}
