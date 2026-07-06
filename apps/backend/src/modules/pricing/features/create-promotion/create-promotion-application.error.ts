export type CreatePromotionApplicationErrorCode =
  | 'InvalidPromotionConfiguration'
  | 'DuplicatePromotionTarget'
  | 'Unexpected';

export interface CreatePromotionApplicationError {
  code: CreatePromotionApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function createPromotionApplicationError(
  code: CreatePromotionApplicationErrorCode,
  message: string,
  cause?: unknown,
): CreatePromotionApplicationError {
  return { code, message, cause };
}
