export type GetRentalAccessoryDefaultsApplicationErrorCode = 'RentalNotFound' | 'Unexpected';

export interface GetRentalAccessoryDefaultsApplicationError {
  code: GetRentalAccessoryDefaultsApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function getRentalAccessoryDefaultsApplicationError(
  code: GetRentalAccessoryDefaultsApplicationErrorCode,
  message: string,
  cause?: unknown,
): GetRentalAccessoryDefaultsApplicationError {
  return { code, message, cause };
}
