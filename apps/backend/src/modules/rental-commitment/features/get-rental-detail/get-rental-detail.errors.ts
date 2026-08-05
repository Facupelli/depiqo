import { ApplicationError } from 'src/core/errors/application-error';

export type GetRentalDetailErrorCode = 'rental_commitment.rental_not_found';

export interface GetRentalDetailError extends ApplicationError {
  code: GetRentalDetailErrorCode;
}

export function getRentalDetailError(
  code: GetRentalDetailErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): GetRentalDetailError {
  return { code, message, cause, context };
}
