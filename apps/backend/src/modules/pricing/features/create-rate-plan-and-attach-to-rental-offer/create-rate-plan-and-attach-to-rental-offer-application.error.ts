export type CreateRatePlanAndAttachToRentalOfferApplicationErrorCode =
  | 'RentalOfferNotFound'
  | 'RatePlanNameAlreadyInUse'
  | 'InvalidRatePlan'
  | 'Unexpected';

export interface CreateRatePlanAndAttachToRentalOfferApplicationError {
  code: CreateRatePlanAndAttachToRentalOfferApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function createRatePlanAndAttachToRentalOfferApplicationError(
  code: CreateRatePlanAndAttachToRentalOfferApplicationErrorCode,
  message: string,
  cause?: unknown,
): CreateRatePlanAndAttachToRentalOfferApplicationError {
  return { code, message, cause };
}
