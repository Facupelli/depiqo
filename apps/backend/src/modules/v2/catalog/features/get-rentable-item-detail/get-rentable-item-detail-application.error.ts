export type GetRentableItemDetailApplicationErrorCode = 'RentableItemNotFound' | 'Unexpected';

export interface GetRentableItemDetailApplicationError {
  code: GetRentableItemDetailApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function getRentableItemDetailApplicationError(
  code: GetRentableItemDetailApplicationErrorCode,
  message: string,
  cause?: unknown,
): GetRentableItemDetailApplicationError {
  return { code, message, cause };
}
