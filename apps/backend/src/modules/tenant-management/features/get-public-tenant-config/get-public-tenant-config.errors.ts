import { ApplicationError } from 'src/core/errors/application-error';

export type GetPublicTenantConfigErrorCode = 'tenant_management.tenant_not_found';

export interface GetPublicTenantConfigError extends ApplicationError {
  code: GetPublicTenantConfigErrorCode;
}

export function getPublicTenantConfigError(
  code: GetPublicTenantConfigErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): GetPublicTenantConfigError {
  return { code, message, cause, context };
}
