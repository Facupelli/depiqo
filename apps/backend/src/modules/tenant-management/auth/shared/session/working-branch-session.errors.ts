import { ApplicationError } from 'src/core/errors/application-error';

export type WorkingBranchSessionErrorCode = 'tenant_management.branch_not_found';

export interface WorkingBranchSessionError extends ApplicationError {
  code: WorkingBranchSessionErrorCode;
}

export function workingBranchSessionError(
  code: WorkingBranchSessionErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): WorkingBranchSessionError {
  return { code, message, cause, context };
}
