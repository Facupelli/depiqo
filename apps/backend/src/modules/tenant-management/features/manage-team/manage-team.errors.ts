import type { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type ManageTenantTeamErrorCode =
  | 'tenant_management.collaborator_not_found'
  | 'tenant_management.role_not_found'
  | 'tenant_management.collaborator_email_already_in_use'
  | 'tenant_management.cannot_manage_self'
  | 'tenant_management.collaborator_management_forbidden'
  | 'tenant_management.role_assignment_forbidden'
  | 'tenant_management.administrator_role_assignment_forbidden'
  | 'tenant_management.last_active_administrator'
  | 'tenant_management.invalid_collaborator_status_transition'
  | 'tenant_management.team_authorization_subject_not_found'
  | 'tenant_management.team_authorization_state_invalid';

export interface ManageTenantTeamError extends ApplicationError {
  code: ManageTenantTeamErrorCode;
}

export function manageTenantTeamError(
  code: ManageTenantTeamErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): ManageTenantTeamError {
  return { code, message, cause, context };
}
