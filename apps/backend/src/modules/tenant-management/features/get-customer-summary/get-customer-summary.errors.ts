import { ApplicationError } from 'src/core/errors/application-error';

export type GetCustomerSummaryErrorCode = 'tenant_management.rental_customer_not_found';

export interface GetCustomerSummaryError extends ApplicationError {
  code: GetCustomerSummaryErrorCode;
}

export function getCustomerSummaryError(
  code: GetCustomerSummaryErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): GetCustomerSummaryError {
  return { code, message, cause, context };
}
