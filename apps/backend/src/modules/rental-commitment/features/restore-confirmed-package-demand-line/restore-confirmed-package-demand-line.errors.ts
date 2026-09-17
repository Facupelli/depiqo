import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type RestoreConfirmedPackageDemandLineErrorCode =
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_demand_line_not_found'
  | 'rental_commitment.rental_demand_line_already_current'
  | 'rental_commitment.rental_cannot_be_edited_from_status'
  | 'rental_commitment.rental_period_ended'
  | 'rental_commitment.insufficient_asset_availability'
  | 'rental_commitment.rental_version_conflict'
  | 'rental_commitment.invalid_rental_field';

export interface RestoreConfirmedPackageDemandLineError extends ApplicationError {
  code: RestoreConfirmedPackageDemandLineErrorCode;
}

export const restoreConfirmedPackageDemandLineError = (
  code: RestoreConfirmedPackageDemandLineErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): RestoreConfirmedPackageDemandLineError => ({ code, message, cause, context });
