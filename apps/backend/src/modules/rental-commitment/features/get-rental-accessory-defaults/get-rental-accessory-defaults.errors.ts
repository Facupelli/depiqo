import { ApplicationError } from 'src/core/errors/application-error';

export type GetRentalAccessoryDefaultsErrorCode = 'asset_inventory.rental_not_found';

export interface GetRentalAccessoryDefaultsError extends ApplicationError {
  code: GetRentalAccessoryDefaultsErrorCode;
}

export function getRentalAccessoryDefaultsError(
  code: GetRentalAccessoryDefaultsErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): GetRentalAccessoryDefaultsError {
  return { code, message, cause, context };
}
