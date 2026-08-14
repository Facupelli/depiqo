import { ApplicationError } from 'src/core/errors/application-error';

export type CreateContractSignerErrorCode = 'tenant_management.contract_signer_already_exists';

export interface CreateContractSignerError extends ApplicationError {
  code: CreateContractSignerErrorCode;
}

export function createContractSignerError(
  code: CreateContractSignerErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CreateContractSignerError {
  return { code, message, cause, context };
}
