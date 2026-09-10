import { ApplicationError } from 'src/core/errors/application-error';

export type GetEquipmentTypeRentalUsagesErrorCode = 'offering_management.equipment_type_not_found';

export interface GetEquipmentTypeRentalUsagesError extends ApplicationError {
  code: GetEquipmentTypeRentalUsagesErrorCode;
}

export function getEquipmentTypeRentalUsagesError(
  code: GetEquipmentTypeRentalUsagesErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): GetEquipmentTypeRentalUsagesError {
  return { code, message, cause, context };
}
