import { ApplicationError } from 'src/core/errors/application-error';

import { EquipmentTypeNotActiveError, EquipmentTypeNotFoundError } from '../../domain/errors/asset-inventory.errors';

export type CreateEquipmentTypeAccessoryDefaultsErrorCode =
  | 'asset_inventory.equipment_type_not_found'
  | 'asset_inventory.equipment_type_not_active'
  | 'asset_inventory.accessory_equipment_type_not_found'
  | 'asset_inventory.accessory_equipment_type_not_active'
  | 'asset_inventory.duplicate_accessory_default_in_request'
  | 'asset_inventory.accessory_default_already_exists'
  | 'asset_inventory.accessory_default_self_reference_not_allowed';

export interface CreateEquipmentTypeAccessoryDefaultsError extends ApplicationError {
  code: CreateEquipmentTypeAccessoryDefaultsErrorCode;
}

export class AccessoryDefaultAlreadyExistsError extends Error {
  constructor(
    public readonly equipmentTypeId: string,
    public readonly accessoryEquipmentTypeId: string,
  ) {
    super(
      `Accessory default already exists for equipment type "${equipmentTypeId}" and accessory "${accessoryEquipmentTypeId}".`,
    );
  }
}

export class DuplicateAccessoryInRequestError extends Error {
  constructor(public readonly accessoryEquipmentTypeId: string) {
    super(`Accessory equipment type "${accessoryEquipmentTypeId}" appears more than once in the request.`);
  }
}

export class SelfReferenceAccessoryDefaultError extends Error {
  constructor(public readonly equipmentTypeId: string) {
    super(`Equipment type "${equipmentTypeId}" cannot be its own accessory default.`);
  }
}

export function createEquipmentTypeAccessoryDefaultsError(
  code: CreateEquipmentTypeAccessoryDefaultsErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CreateEquipmentTypeAccessoryDefaultsError {
  return { code, message, cause, context };
}

export function mapCreateEquipmentTypeAccessoryDefaultsError(
  error: unknown,
  role: 'equipmentType' | 'accessoryEquipmentType' = 'equipmentType',
): CreateEquipmentTypeAccessoryDefaultsError {
  if (error instanceof EquipmentTypeNotFoundError) {
    const code =
      role === 'equipmentType'
        ? 'asset_inventory.equipment_type_not_found'
        : 'asset_inventory.accessory_equipment_type_not_found';
    const contextKey = role === 'equipmentType' ? 'equipmentTypeId' : 'accessoryEquipmentTypeId';

    return createEquipmentTypeAccessoryDefaultsError(code, error.message, error, {
      [contextKey]: error.equipmentTypeId,
    });
  }

  if (error instanceof EquipmentTypeNotActiveError) {
    const code =
      role === 'equipmentType'
        ? 'asset_inventory.equipment_type_not_active'
        : 'asset_inventory.accessory_equipment_type_not_active';
    const contextKey = role === 'equipmentType' ? 'equipmentTypeId' : 'accessoryEquipmentTypeId';

    return createEquipmentTypeAccessoryDefaultsError(code, error.message, error, {
      [contextKey]: error.equipmentTypeId,
    });
  }

  if (error instanceof DuplicateAccessoryInRequestError) {
    return createEquipmentTypeAccessoryDefaultsError(
      'asset_inventory.duplicate_accessory_default_in_request',
      error.message,
      error,
      { accessoryEquipmentTypeId: error.accessoryEquipmentTypeId },
    );
  }

  if (error instanceof AccessoryDefaultAlreadyExistsError) {
    return createEquipmentTypeAccessoryDefaultsError(
      'asset_inventory.accessory_default_already_exists',
      error.message,
      error,
      {
        equipmentTypeId: error.equipmentTypeId,
        accessoryEquipmentTypeId: error.accessoryEquipmentTypeId,
      },
    );
  }

  if (error instanceof SelfReferenceAccessoryDefaultError) {
    return createEquipmentTypeAccessoryDefaultsError(
      'asset_inventory.accessory_default_self_reference_not_allowed',
      error.message,
      error,
      { equipmentTypeId: error.equipmentTypeId },
    );
  }

  throw error;
}
