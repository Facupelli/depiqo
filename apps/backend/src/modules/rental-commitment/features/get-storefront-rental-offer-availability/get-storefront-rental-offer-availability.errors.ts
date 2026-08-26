import type { ApplicationError } from 'src/core/errors/application-error';

export type GetStorefrontRentalOfferAvailabilityErrorCode = 'rental_commitment.invalid_fulfillment_definition';

export interface GetStorefrontRentalOfferAvailabilityError extends ApplicationError {
  code: GetStorefrontRentalOfferAvailabilityErrorCode;
}

export function getStorefrontRentalOfferAvailabilityError(
  code: GetStorefrontRentalOfferAvailabilityErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): GetStorefrontRentalOfferAvailabilityError {
  return { code, message, cause, context };
}
