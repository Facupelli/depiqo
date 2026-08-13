import { ApplicationError } from 'src/core/errors/application-error';

import { EquipmentTypeNotFoundError } from '../../domain/errors/asset-inventory.errors';

export type ReplaceEquipmentTypeAccessoryDefaultsErrorCode =
  | 'asset_inventory.equipment_type_not_found'
  | 'asset_inventory.accessory_equipment_type_not_found'
  | 'asset_inventory.duplicate_accessory_default_in_request'
  | 'asset_inventory.accessory_default_self_reference_not_allowed';

export interface ReplaceEquipmentTypeAccessoryDefaultsError extends ApplicationError {
  code: ReplaceEquipmentTypeAccessoryDefaultsErrorCode;
}

export class DuplicateAccessoryInReplacementError extends Error {
  constructor(public readonly accessoryEquipmentTypeId: string) {
    super(`Accessory equipment type "${accessoryEquipmentTypeId}" appears more than once in the replacement set.`);
  }
}

export class SelfReferenceAccessoryReplacementError extends Error {
  constructor(public readonly equipmentTypeId: string) {
    super(`Equipment type "${equipmentTypeId}" cannot be its own accessory default.`);
  }
}

function replaceEquipmentTypeAccessoryDefaultsError(
  code: ReplaceEquipmentTypeAccessoryDefaultsErrorCode,
  message: string,
  cause: unknown,
  context: Record<string, unknown>,
): ReplaceEquipmentTypeAccessoryDefaultsError {
  return { code, message, cause, context };
}

export function mapReplaceEquipmentTypeAccessoryDefaultsError(
  error: unknown,
  role: 'equipmentType' | 'accessoryEquipmentType' = 'equipmentType',
): ReplaceEquipmentTypeAccessoryDefaultsError {
  if (error instanceof EquipmentTypeNotFoundError) {
    const code =
      role === 'equipmentType'
        ? 'asset_inventory.equipment_type_not_found'
        : 'asset_inventory.accessory_equipment_type_not_found';
    const contextKey = role === 'equipmentType' ? 'equipmentTypeId' : 'accessoryEquipmentTypeId';

    return replaceEquipmentTypeAccessoryDefaultsError(code, error.message, error, {
      [contextKey]: error.equipmentTypeId,
    });
  }

  if (error instanceof DuplicateAccessoryInReplacementError) {
    return replaceEquipmentTypeAccessoryDefaultsError(
      'asset_inventory.duplicate_accessory_default_in_request',
      error.message,
      error,
      { accessoryEquipmentTypeId: error.accessoryEquipmentTypeId },
    );
  }

  if (error instanceof SelfReferenceAccessoryReplacementError) {
    return replaceEquipmentTypeAccessoryDefaultsError(
      'asset_inventory.accessory_default_self_reference_not_allowed',
      error.message,
      error,
      { equipmentTypeId: error.equipmentTypeId },
    );
  }

  throw error;
}
