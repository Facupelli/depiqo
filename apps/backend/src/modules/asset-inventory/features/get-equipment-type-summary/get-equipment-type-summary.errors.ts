import { ApplicationError } from 'src/core/errors/application-error';

export type GetEquipmentTypeSummaryErrorCode = 'asset_inventory.equipment_type_not_found';

export interface GetEquipmentTypeSummaryError extends ApplicationError {
  code: GetEquipmentTypeSummaryErrorCode;
}

export function getEquipmentTypeSummaryError(
  code: GetEquipmentTypeSummaryErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): GetEquipmentTypeSummaryError {
  return { code, message, cause, context };
}
