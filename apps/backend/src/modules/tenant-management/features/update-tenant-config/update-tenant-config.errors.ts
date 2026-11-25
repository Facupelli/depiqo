import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type UpdateTenantConfigErrorCode =
  | 'tenant_management.tenant_not_found'
  | 'tenant_management.invalid_tenant_config'
  | 'tenant_management.rental_asset_buffer_is_branch_scoped';

export interface UpdateTenantConfigError extends ApplicationError {
  code: UpdateTenantConfigErrorCode;
}

export function updateTenantConfigError(
  code: UpdateTenantConfigErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): UpdateTenantConfigError {
  return { code, message, cause, context };
}
