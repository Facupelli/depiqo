import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type GetPromotionDetailErrorCode = 'pricing.promotion_not_found';

export interface GetPromotionDetailError extends ApplicationError {
  code: GetPromotionDetailErrorCode;
}

export function getPromotionDetailError(
  code: GetPromotionDetailErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): GetPromotionDetailError {
  return { code, message, cause, context };
}
