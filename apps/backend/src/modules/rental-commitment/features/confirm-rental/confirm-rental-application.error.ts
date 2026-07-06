export type ConfirmRentalApplicationErrorCode =
  | 'RentalNotFound'
  | 'RentalCannotBeConfirmedFromStatus'
  | 'RentalConfirmationRequiresCustomer'
  | 'ConfirmedRentalRequiresPriceSnapshot'
  | 'InsufficientAssetAvailability'
  | 'DuplicateAssignedAsset'
  | 'InvalidRentalField'
  | 'RentalCommitmentUnexpected'
  | 'Unexpected';

export interface ConfirmRentalApplicationError {
  code: ConfirmRentalApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function confirmRentalApplicationError(
  code: ConfirmRentalApplicationErrorCode,
  message: string,
  cause?: unknown,
): ConfirmRentalApplicationError {
  return { code, message, cause };
}
