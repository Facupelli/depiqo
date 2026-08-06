import { ApplicationError } from 'src/core/errors/application-error';
import {
  AssetInventoryError,
  DuplicateEquipmentTypeNameError,
  InvalidEquipmentTypeFieldError,
} from '../../domain/errors/asset-inventory.errors';

export type UpdateEquipmentTypeErrorCode =
  | 'asset_inventory.equipment_type_not_found'
  | 'asset_inventory.invalid_equipment_type_field'
  | 'asset_inventory.duplicate_equipment_type_name';
export interface UpdateEquipmentTypeError extends ApplicationError {
  code: UpdateEquipmentTypeErrorCode;
}
export const updateEquipmentTypeError = (
  code: UpdateEquipmentTypeErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): UpdateEquipmentTypeError => ({ code, message, cause, context });
export function mapUpdateEquipmentTypeError(error: AssetInventoryError): UpdateEquipmentTypeError {
  if (error instanceof InvalidEquipmentTypeFieldError)
    return updateEquipmentTypeError('asset_inventory.invalid_equipment_type_field', error.message, error, {
      field: error.field,
    });
  if (error instanceof DuplicateEquipmentTypeNameError)
    return updateEquipmentTypeError('asset_inventory.duplicate_equipment_type_name', error.message, error, {
      name: error.name,
    });
  throw error;
}
