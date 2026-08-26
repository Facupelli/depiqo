import { ApplicationError } from 'src/core/errors/application-error';

export type UpdateTenantBrandingErrorCode = 'tenant_management.tenant_not_found';

export interface UpdateTenantBrandingError extends ApplicationError {
  code: UpdateTenantBrandingErrorCode;
}

export function updateTenantBrandingError(
  code: UpdateTenantBrandingErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): UpdateTenantBrandingError {
  return { code, message, cause, context };
}
