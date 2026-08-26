import { ApplicationError } from 'src/core/errors/application-error';

export type CorrectRatePlanErrorCode =
  | 'pricing.rate_plan_not_found'
  | 'pricing.rate_plan_name_already_in_use'
  | 'pricing.rate_plan_impact_changed'
  | 'pricing.invalid_rate_plan';

export interface CorrectRatePlanError extends ApplicationError {
  code: CorrectRatePlanErrorCode;
}

export function correctRatePlanError(
  code: CorrectRatePlanErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CorrectRatePlanError {
  return { code, message, cause, context };
}
