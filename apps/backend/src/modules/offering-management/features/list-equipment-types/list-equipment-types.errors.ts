import { ApplicationError } from 'src/core/errors/application-error';

export type ListEquipmentTypesErrorCode = 'offering_management.equipment_types.branch_not_found';

export interface ListEquipmentTypesError extends ApplicationError {
  code: ListEquipmentTypesErrorCode;
}

export function listEquipmentTypesError(
  code: ListEquipmentTypesErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): ListEquipmentTypesError {
  return { code, message, cause, context };
}
