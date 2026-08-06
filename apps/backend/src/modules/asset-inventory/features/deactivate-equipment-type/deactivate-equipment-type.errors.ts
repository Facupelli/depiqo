import { ApplicationError } from 'src/core/errors/application-error';

export interface DeactivateEquipmentTypeError extends ApplicationError {
  code: 'asset_inventory.equipment_type_not_found';
}

export function deactivateEquipmentTypeError(
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): DeactivateEquipmentTypeError {
  return {
    code: 'asset_inventory.equipment_type_not_found',
    message,
    cause,
    context,
  };
}
