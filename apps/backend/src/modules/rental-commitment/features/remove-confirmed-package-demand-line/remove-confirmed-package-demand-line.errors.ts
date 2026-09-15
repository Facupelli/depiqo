import { ApplicationError } from 'src/core/errors/application-error';

export type RemoveConfirmedPackageDemandLineErrorCode =
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_demand_line_not_found'
  | 'rental_commitment.rental_cannot_be_edited_from_status'
  | 'rental_commitment.rental_period_ended'
  | 'rental_commitment.rental_demand_line_referenced_by_accessory'
  | 'rental_commitment.rental_version_conflict'
  | 'rental_commitment.invalid_rental_field';

export interface RemoveConfirmedPackageDemandLineError extends ApplicationError {
  code: RemoveConfirmedPackageDemandLineErrorCode;
}

export const removeConfirmedPackageDemandLineError = (
  code: RemoveConfirmedPackageDemandLineErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): RemoveConfirmedPackageDemandLineError => ({ code, message, cause, context });
