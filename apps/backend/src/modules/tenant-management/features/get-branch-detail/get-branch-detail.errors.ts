import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type GetBranchDetailErrorCode = 'tenant_management.branch_not_found';

export interface GetBranchDetailError extends ApplicationError {
  code: GetBranchDetailErrorCode;
}

export function getBranchDetailError(
  code: GetBranchDetailErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): GetBranchDetailError {
  return { code, message, cause, context };
}
