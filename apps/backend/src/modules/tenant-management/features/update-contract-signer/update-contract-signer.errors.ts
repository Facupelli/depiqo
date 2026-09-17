import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type UpdateContractSignerErrorCode = 'tenant_management.contract_signer_not_found';

export interface UpdateContractSignerError extends ApplicationError {
  code: UpdateContractSignerErrorCode;
}

export function updateContractSignerError(
  code: UpdateContractSignerErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): UpdateContractSignerError {
  return { code, message, cause, context };
}
