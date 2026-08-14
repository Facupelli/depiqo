import { ApplicationError } from 'src/core/errors/application-error';

export type RefreshCustomDomainStatusErrorCode = 'tenant_management.custom_domain_not_found';

export interface RefreshCustomDomainStatusError extends ApplicationError {
  code: RefreshCustomDomainStatusErrorCode;
}

export function refreshCustomDomainStatusError(
  code: RefreshCustomDomainStatusErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): RefreshCustomDomainStatusError {
  return { code, message, cause, context };
}
