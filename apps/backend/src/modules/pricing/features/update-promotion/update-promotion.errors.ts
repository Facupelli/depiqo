import { ApplicationError } from 'src/core/errors/application-error';

export type UpdatePromotionErrorCode =
  | 'pricing.promotion_not_found'
  | 'pricing.invalid_promotion_configuration'
  | 'pricing.duplicate_promotion_target';

export interface UpdatePromotionError extends ApplicationError {
  code: UpdatePromotionErrorCode;
}

export function updatePromotionError(
  code: UpdatePromotionErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): UpdatePromotionError {
  return { code, message, cause, context };
}
