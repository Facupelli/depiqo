import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type GetCurrentTenantErrorCode = 'tenant_management.tenant_not_found';

export interface GetCurrentTenantError extends ApplicationError {
  code: GetCurrentTenantErrorCode;
}

export function getCurrentTenantError(
  code: GetCurrentTenantErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): GetCurrentTenantError {
  return { code, message, cause, context };
}
