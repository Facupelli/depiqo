import { ApplicationError } from 'src/core/errors/application-error';

export type PutBranchDeliveryConfigurationErrorCode = 'delivery.branch_not_found' | 'delivery.configuration_invalid';

export interface PutBranchDeliveryConfigurationError extends ApplicationError {
  code: PutBranchDeliveryConfigurationErrorCode;
}

export function putBranchDeliveryConfigurationError(
  code: PutBranchDeliveryConfigurationErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): PutBranchDeliveryConfigurationError {
  return { code, message, cause, context };
}
