import { ApplicationError } from 'src/core/errors/application-error';

export type GetBranchDetailErrorCode = 'tenant_management.branch_not_found';

export interface GetBranchDetailError extends ApplicationError {
  code: GetBranchDetailErrorCode;
}

export function getBranchDetailError(
  code: GetBranchDetailErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): GetBranchDetailError {
  return { code, message, cause, context };
}
