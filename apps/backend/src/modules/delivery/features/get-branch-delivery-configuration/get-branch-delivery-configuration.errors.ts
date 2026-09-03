import { ApplicationError } from 'src/core/errors/application-error';

export type GetBranchDeliveryConfigurationErrorCode = 'delivery.branch_not_found';

export interface GetBranchDeliveryConfigurationError extends ApplicationError {
  code: GetBranchDeliveryConfigurationErrorCode;
}

export function getBranchDeliveryConfigurationError(
  code: GetBranchDeliveryConfigurationErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): GetBranchDeliveryConfigurationError {
  return { code, message, cause, context };
}
