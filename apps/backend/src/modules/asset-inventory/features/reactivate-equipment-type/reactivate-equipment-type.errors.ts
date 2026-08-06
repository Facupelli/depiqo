import { ApplicationError } from 'src/core/errors/application-error';

export interface ReactivateEquipmentTypeError extends ApplicationError {
  code: 'asset_inventory.equipment_type_not_found';
}

export function reactivateEquipmentTypeError(
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): ReactivateEquipmentTypeError {
  return {
    code: 'asset_inventory.equipment_type_not_found',
    message,
    cause,
    context,
  };
}
