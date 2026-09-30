import { ApplicationError } from 'src/core/errors/application-error';

export type ReplaceEquipmentTypeAccessoryDefaultsErrorCode =
  | 'asset_inventory.equipment_type_not_found'
  | 'asset_inventory.accessory_equipment_type_not_found'
  | 'asset_inventory.duplicate_accessory_default_in_request'
  | 'asset_inventory.accessory_default_self_reference_not_allowed'
  | 'asset_inventory.invalid_accessory_default_quantity';

export interface ReplaceEquipmentTypeAccessoryDefaultsError extends ApplicationError {
  code: ReplaceEquipmentTypeAccessoryDefaultsErrorCode;
}
