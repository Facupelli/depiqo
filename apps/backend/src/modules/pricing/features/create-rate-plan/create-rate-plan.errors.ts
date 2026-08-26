import { ApplicationError } from 'src/core/errors/application-error';

export type CreateRatePlanErrorCode = 'pricing.rate_plan_name_already_in_use' | 'pricing.invalid_rate_plan';

export interface CreateRatePlanError extends ApplicationError {
  code: CreateRatePlanErrorCode;
}

export function createRatePlanError(
  code: CreateRatePlanErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CreateRatePlanError {
  return { code, message, cause, context };
}
