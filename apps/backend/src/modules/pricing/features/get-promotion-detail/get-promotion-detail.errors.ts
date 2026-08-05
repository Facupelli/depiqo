import { ApplicationError } from 'src/core/errors/application-error';

export type GetPromotionDetailErrorCode = 'pricing.promotion_not_found';

export interface GetPromotionDetailError extends ApplicationError {
  code: GetPromotionDetailErrorCode;
}

export function getPromotionDetailError(
  code: GetPromotionDetailErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): GetPromotionDetailError {
  return { code, message, cause, context };
}
