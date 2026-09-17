import type { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type ManageTenantRolesErrorCode =
  | 'tenant_management.role_not_found'
  | 'tenant_management.role_name_already_in_use'
  | 'tenant_management.system_role_cannot_be_edited'
  | 'tenant_management.system_role_cannot_be_deleted'
  | 'tenant_management.role_in_use'
  | 'tenant_management.role_permission_escalation_forbidden'
  | 'tenant_management.role_authorization_subject_not_found'
  | 'tenant_management.role_authorization_state_invalid';

export interface ManageTenantRolesError extends ApplicationError {
  code: ManageTenantRolesErrorCode;
}

export function manageTenantRolesError(
  code: ManageTenantRolesErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): ManageTenantRolesError {
  return { code, message, cause, context };
}
