import { ApplicationError } from 'src/core/errors/application-error';

export type UpdateBranchErrorCode =
  | 'tenant_management.branch_not_found'
  | 'tenant_management.branch_invalid_input'
  | 'tenant_management.branch_schedule_invalid_input';

export interface UpdateBranchError extends ApplicationError {
  code: UpdateBranchErrorCode;
}

export function updateBranchError(
  code: UpdateBranchErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): UpdateBranchError {
  return { code, message, cause, context };
}
