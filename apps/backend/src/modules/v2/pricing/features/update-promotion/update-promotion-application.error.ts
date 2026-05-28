export type UpdatePromotionApplicationErrorCode =
  | 'PromotionNotFound'
  | 'InvalidPromotionConfiguration'
  | 'DuplicatePromotionTarget'
  | 'Unexpected';

export interface UpdatePromotionApplicationError {
  code: UpdatePromotionApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function updatePromotionApplicationError(
  code: UpdatePromotionApplicationErrorCode,
  message: string,
  cause?: unknown,
): UpdatePromotionApplicationError {
  return { code, message, cause };
}
