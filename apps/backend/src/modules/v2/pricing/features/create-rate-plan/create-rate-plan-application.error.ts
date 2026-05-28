export type CreateRatePlanApplicationErrorCode = 'RatePlanNameAlreadyInUse' | 'InvalidRatePlan' | 'Unexpected';

export interface CreateRatePlanApplicationError {
  code: CreateRatePlanApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function createRatePlanApplicationError(
  code: CreateRatePlanApplicationErrorCode,
  message: string,
  cause?: unknown,
): CreateRatePlanApplicationError {
  return { code, message, cause };
}
