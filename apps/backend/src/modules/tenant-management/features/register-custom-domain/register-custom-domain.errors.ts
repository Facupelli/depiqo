import { ApplicationError } from 'src/core/errors/application-error';

export type RegisterCustomDomainErrorCode =
  | 'tenant_management.invalid_custom_domain'
  | 'tenant_management.unsupported_apex_custom_domain'
  | 'tenant_management.tenant_not_found'
  | 'tenant_management.custom_domain_already_in_use'
  | 'tenant_management.tenant_already_has_custom_domain';

export interface RegisterCustomDomainError extends ApplicationError {
  code: RegisterCustomDomainErrorCode;
}

export function registerCustomDomainError(
  code: RegisterCustomDomainErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): RegisterCustomDomainError {
  return { code, message, cause, context };
}
