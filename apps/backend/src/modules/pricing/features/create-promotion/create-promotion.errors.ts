import { ApplicationError } from 'src/core/errors/application-error';

export type CreatePromotionErrorCode = 'pricing.invalid_promotion_configuration' | 'pricing.duplicate_promotion_target';

export interface CreatePromotionError extends ApplicationError {
  code: CreatePromotionErrorCode;
}

export function createPromotionError(
  code: CreatePromotionErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CreatePromotionError {
  return { code, message, cause, context };
}
