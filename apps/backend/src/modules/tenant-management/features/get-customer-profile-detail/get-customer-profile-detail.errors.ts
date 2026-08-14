import { ApplicationError } from 'src/core/errors/application-error';

export type GetCustomerProfileDetailErrorCode =
  | 'tenant_management.rental_customer_not_found'
  | 'tenant_management.customer_profile_not_found';

export interface GetCustomerProfileDetailError extends ApplicationError {
  code: GetCustomerProfileDetailErrorCode;
}

export function getCustomerProfileDetailError(
  code: GetCustomerProfileDetailErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): GetCustomerProfileDetailError {
  return { code, message, cause, context };
}
