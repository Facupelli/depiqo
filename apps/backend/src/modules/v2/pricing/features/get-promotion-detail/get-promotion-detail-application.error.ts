export type GetPromotionDetailApplicationErrorCode = 'PromotionNotFound';

export interface GetPromotionDetailApplicationError {
  code: GetPromotionDetailApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function getPromotionDetailApplicationError(
  code: GetPromotionDetailApplicationErrorCode,
  message: string,
  cause?: unknown,
): GetPromotionDetailApplicationError {
  return { code, message, cause };
}
