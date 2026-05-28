export type CreateContractSignerApplicationErrorCode = 'ContractSignerAlreadyExists' | 'Unexpected';

export interface CreateContractSignerApplicationError {
  code: CreateContractSignerApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function createContractSignerApplicationError(
  code: CreateContractSignerApplicationErrorCode,
  message: string,
  cause?: unknown,
): CreateContractSignerApplicationError {
  return { code, message, cause };
}
