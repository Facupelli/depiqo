import type { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type GetRentalsCalendarErrorCode =
  | 'rental_commitment.branch_not_found'
  | 'rental_commitment.tenant_config_invalid';

export interface GetRentalsCalendarError extends ApplicationError {
  code: GetRentalsCalendarErrorCode;
}

export function getRentalsCalendarError(
  code: GetRentalsCalendarErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): GetRentalsCalendarError {
  return { code, message, cause, context };
}
