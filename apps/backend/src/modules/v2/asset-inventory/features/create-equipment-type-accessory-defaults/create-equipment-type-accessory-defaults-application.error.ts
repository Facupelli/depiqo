export type CreateEquipmentTypeAccessoryDefaultsApplicationErrorCode =
  | 'EquipmentTypeNotFound'
  | 'EquipmentTypeNotActive'
  | 'AccessoryEquipmentTypeNotFound'
  | 'AccessoryEquipmentTypeNotActive'
  | 'DuplicateAccessoryInRequest'
  | 'AccessoryDefaultAlreadyExists'
  | 'SelfReferenceNotAllowed'
  | 'Unexpected';

export interface CreateEquipmentTypeAccessoryDefaultsApplicationError {
  code: CreateEquipmentTypeAccessoryDefaultsApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function createEquipmentTypeAccessoryDefaultsApplicationError(
  code: CreateEquipmentTypeAccessoryDefaultsApplicationErrorCode,
  message: string,
  cause?: unknown,
): CreateEquipmentTypeAccessoryDefaultsApplicationError {
  return { code, message, cause };
}
