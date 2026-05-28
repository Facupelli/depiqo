import { RatePlanDomainError } from '../../domain/errors/rate-plan.errors';
import { CreateRatePlanApplicationError, createRatePlanApplicationError } from './create-rate-plan-application.error';

export function mapCreateRatePlanError(error: unknown): CreateRatePlanApplicationError {
  if (error instanceof RatePlanDomainError) {
    return createRatePlanApplicationError('InvalidRatePlan', error.message, error);
  }

  return createRatePlanApplicationError('Unexpected', 'An unexpected error occurred.', error);
}
