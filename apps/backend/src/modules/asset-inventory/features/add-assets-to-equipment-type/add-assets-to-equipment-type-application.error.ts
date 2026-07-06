export type AddAssetsToEquipmentTypeApplicationErrorCode =
  | 'TenantValidationFailed'
  | 'EquipmentTypeNotFound'
  | 'EquipmentTypeNotActive'
  | 'InvalidAssetField'
  | 'DuplicateAssetSerialNumber'
  | 'AssetOwnerNotFound'
  | 'ActiveOwnerContractNotFound'
  | 'MultipleActiveOwnerContracts'
  | 'Unexpected';

export interface AddAssetsToEquipmentTypeApplicationError {
  code: AddAssetsToEquipmentTypeApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function addAssetsToEquipmentTypeApplicationError(
  code: AddAssetsToEquipmentTypeApplicationErrorCode,
  message: string,
  cause?: unknown,
): AddAssetsToEquipmentTypeApplicationError {
  return { code, message, cause };
}
