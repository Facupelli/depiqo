export type GetEquipmentTypeDetailApplicationErrorCode = 'EquipmentTypeNotFound' | 'Unexpected';

export interface GetEquipmentTypeDetailApplicationError {
  code: GetEquipmentTypeDetailApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function getEquipmentTypeDetailApplicationError(
  code: GetEquipmentTypeDetailApplicationErrorCode,
  message: string,
  cause?: unknown,
): GetEquipmentTypeDetailApplicationError {
  return { code, message, cause };
}
