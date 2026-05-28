export type GetOwnerDetailApplicationErrorCode = 'OwnerNotFound' | 'Unexpected';

export interface GetOwnerDetailApplicationError {
  code: GetOwnerDetailApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function getOwnerDetailApplicationError(
  code: GetOwnerDetailApplicationErrorCode,
  message: string,
  cause?: unknown,
): GetOwnerDetailApplicationError {
  return { code, message, cause };
}
