export type UpdateContractSignerApplicationErrorCode = 'ContractSignerNotFound' | 'Unexpected';

export interface UpdateContractSignerApplicationError {
  code: UpdateContractSignerApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function updateContractSignerApplicationError(
  code: UpdateContractSignerApplicationErrorCode,
  message: string,
  cause?: unknown,
): UpdateContractSignerApplicationError {
  return { code, message, cause };
}
