export type CreateEquipmentTypeApplicationErrorCode =
  | 'TenantValidationFailed'
  | 'InvalidEquipmentTypeField'
  | 'DuplicateEquipmentTypeName'
  | 'InvalidAssetField'
  | 'DuplicateAssetSerialNumber'
  | 'AssetOwnerNotFound'
  | 'ActiveOwnerContractNotFound'
  | 'MultipleActiveOwnerContracts'
  | 'Unexpected';

export interface CreateEquipmentTypeApplicationError {
  code: CreateEquipmentTypeApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function createEquipmentTypeApplicationError(
  code: CreateEquipmentTypeApplicationErrorCode,
  message: string,
  cause?: unknown,
): CreateEquipmentTypeApplicationError {
  return { code, message, cause };
}
