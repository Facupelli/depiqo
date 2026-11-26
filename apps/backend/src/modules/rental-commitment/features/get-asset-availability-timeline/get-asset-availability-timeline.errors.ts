import type { ApplicationError } from 'src/core/errors/application-error';

export interface GetAssetAvailabilityTimelineError extends ApplicationError {
  code: 'rental_commitment.branch_not_found' | 'rental_commitment.tenant_config_invalid';
}
