export type GetRentalDetailApplicationErrorCode = 'RentalNotFound' | 'Unexpected';

export interface GetRentalDetailApplicationError {
  code: GetRentalDetailApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function getRentalDetailApplicationError(
  code: GetRentalDetailApplicationErrorCode,
  message: string,
  cause?: unknown,
): GetRentalDetailApplicationError {
  return { code, message, cause };
}
