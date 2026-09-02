import { ApplicationError } from 'src/core/errors/application-error';

export type CreateBranchErrorCode =
  | 'tenant_management.branch_invalid_input'
  | 'tenant_management.branch_schedule_invalid_input'
  | 'tenant_management.branch_address_unresolved'
  | 'tenant_management.branch_address_ambiguous';

export interface CreateBranchError extends ApplicationError {
  code: CreateBranchErrorCode;
}

export function createBranchError(
  code: CreateBranchErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CreateBranchError {
  return { code, message, cause, context };
}
