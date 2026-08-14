import { ApplicationError } from 'src/core/errors/application-error';

export type GetRatePlanDetailErrorCode = 'pricing.rate_plan_not_found';

export interface GetRatePlanDetailError extends ApplicationError {
  code: GetRatePlanDetailErrorCode;
}

export function getRatePlanDetailError(
  code: GetRatePlanDetailErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): GetRatePlanDetailError {
  return { code, message, cause, context };
}
