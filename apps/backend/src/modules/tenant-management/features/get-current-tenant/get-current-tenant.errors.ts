import type { ApplicationErrorContext } from 'src/core/errors/application-error';

import type { GetCurrentTenantError, GetCurrentTenantErrorCode } from '../../public-api/get-current-tenant.public-api';

export function getCurrentTenantError(
  code: GetCurrentTenantErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): GetCurrentTenantError {
  return { code, message, cause, context };
}
