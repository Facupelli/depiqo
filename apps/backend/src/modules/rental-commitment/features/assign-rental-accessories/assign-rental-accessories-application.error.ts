export type AssignRentalAccessoriesApplicationErrorCode =
  | 'RentalNotFound'
  | 'RentalStatusDoesNotAllowAccessoryAssignment'
  | 'InvalidAccessoryQuantity'
  | 'DuplicateAccessorySelection'
  | 'InsufficientAssetAvailability'
  | 'DuplicateAccessoryAsset'
  | 'SourceRentalDemandLineNotFound'
  | 'AccessoryAssetNotFound'
  | 'AccessoryAssetNotAssignable'
  | 'AccessoryAssetUnavailable'
  | 'Unexpected';

export interface AssignRentalAccessoriesApplicationError {
  code: AssignRentalAccessoriesApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function assignRentalAccessoriesApplicationError(
  code: AssignRentalAccessoriesApplicationErrorCode,
  message: string,
  cause?: unknown,
): AssignRentalAccessoriesApplicationError {
  return { code, message, cause };
}
