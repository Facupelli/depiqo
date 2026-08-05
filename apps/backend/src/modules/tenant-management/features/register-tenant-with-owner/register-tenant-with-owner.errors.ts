import { ApplicationError } from 'src/core/errors/application-error';

export type RegisterTenantWithOwnerErrorCode =
  | 'tenant_management.tenant_registration_invalid_input'
  | 'tenant_management.tenant_slug_already_in_use';

export interface RegisterTenantWithOwnerError extends ApplicationError {
  code: RegisterTenantWithOwnerErrorCode;
}

export function registerTenantWithOwnerError(
  code: RegisterTenantWithOwnerErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): RegisterTenantWithOwnerError {
  return { code, message, cause, context };
}
