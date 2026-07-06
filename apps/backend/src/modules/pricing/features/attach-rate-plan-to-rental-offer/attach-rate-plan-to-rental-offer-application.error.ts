export type AttachRatePlanToRentalOfferApplicationErrorCode =
  | 'RentalOfferNotFound'
  | 'RatePlanNotFound'
  | 'RatePlanInactive'
  | 'Unexpected';

export interface AttachRatePlanToRentalOfferApplicationError {
  code: AttachRatePlanToRentalOfferApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function attachRatePlanToRentalOfferApplicationError(
  code: AttachRatePlanToRentalOfferApplicationErrorCode,
  message: string,
  cause?: unknown,
): AttachRatePlanToRentalOfferApplicationError {
  return { code, message, cause };
}
