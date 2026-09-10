import { ApplicationError } from 'src/core/errors/application-error';

export type GetEquipmentTypeAssetsErrorCode = 'asset_inventory.equipment_type_not_found';

export interface GetEquipmentTypeAssetsError extends ApplicationError {
  code: GetEquipmentTypeAssetsErrorCode;
}

export function getEquipmentTypeAssetsError(
  code: GetEquipmentTypeAssetsErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): GetEquipmentTypeAssetsError {
  return { code, message, cause, context };
}
