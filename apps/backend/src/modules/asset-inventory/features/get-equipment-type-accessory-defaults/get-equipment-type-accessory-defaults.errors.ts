import { ApplicationError } from 'src/core/errors/application-error';

export type GetEquipmentTypeAccessoryDefaultsErrorCode = 'asset_inventory.equipment_type_not_found';

export interface GetEquipmentTypeAccessoryDefaultsError extends ApplicationError {
  code: GetEquipmentTypeAccessoryDefaultsErrorCode;
}

export function getEquipmentTypeAccessoryDefaultsError(
  code: GetEquipmentTypeAccessoryDefaultsErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): GetEquipmentTypeAccessoryDefaultsError {
  return { code, message, cause, context };
}
