import { ApplicationError } from 'src/core/errors/application-error';

export type UpdateTenantConfigErrorCode =
  | 'tenant_management.tenant_not_found'
  | 'tenant_management.invalid_tenant_config';

export interface UpdateTenantConfigError extends ApplicationError {
  code: UpdateTenantConfigErrorCode;
}

export function updateTenantConfigError(
  code: UpdateTenantConfigErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): UpdateTenantConfigError {
  return { code, message, cause, context };
}
