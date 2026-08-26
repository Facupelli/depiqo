import { ApplicationError } from 'src/core/errors/application-error';

export type GetEquipmentTypeDetailErrorCode = 'asset_inventory.equipment_type_not_found';

export interface GetEquipmentTypeDetailError extends ApplicationError {
  code: GetEquipmentTypeDetailErrorCode;
}

export function getEquipmentTypeDetailError(
  code: GetEquipmentTypeDetailErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): GetEquipmentTypeDetailError {
  return { code, message, cause, context };
}
