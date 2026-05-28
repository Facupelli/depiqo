export type ActivateRentableItemApplicationErrorCode =
  | 'RentableItemNotFound'
  | 'RentableItemNotInDraftStatus'
  | 'RentableItemHasNoRequirements'
  | 'RentableItemHasNoRentalOffers'
  | 'RentableItemHasNoActivePricing'
  | 'RentableItemHasInsufficientActiveAssets'
  | 'Unexpected';

export interface InsufficientActiveAssetsContext {
  branchId: string;
  equipmentTypeId: string;
  requiredQuantity: number;
  activeAssetCount: number;
}

export interface ActivateRentableItemApplicationError {
  code: ActivateRentableItemApplicationErrorCode;
  message: string;
  cause?: unknown;
  context?: InsufficientActiveAssetsContext;
}

export function activateRentableItemApplicationError(
  code: ActivateRentableItemApplicationErrorCode,
  message: string,
  cause?: unknown,
  context?: InsufficientActiveAssetsContext,
): ActivateRentableItemApplicationError {
  return { code, message, cause, context };
}
