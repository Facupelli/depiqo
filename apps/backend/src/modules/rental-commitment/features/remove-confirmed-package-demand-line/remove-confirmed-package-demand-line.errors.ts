import { ApplicationError } from 'src/core/errors/application-error';

export type RemoveConfirmedPackageDemandLineErrorCode =
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_demand_line_not_found'
  | 'rental_commitment.rental_cannot_be_edited_from_status'
  | 'rental_commitment.rental_period_ended'
  | 'rental_commitment.rental_demand_line_referenced_by_accessory'
  | 'rental_commitment.rental_version_conflict'
  | 'rental_commitment.demand_line_not_part_of_package'
  | 'rental_commitment.package_must_retain_demand_line'
  | 'rental_commitment.invalid_package_demand_line_removal_quantity'
  | 'rental_commitment.release_asset_count_mismatch'
  | 'rental_commitment.duplicate_release_asset_ids'
  | 'rental_commitment.release_asset_demand_line_mismatch';

export interface RemoveConfirmedPackageDemandLineError extends ApplicationError {
  code: RemoveConfirmedPackageDemandLineErrorCode;
}

export const removeConfirmedPackageDemandLineError = (
  code: RemoveConfirmedPackageDemandLineErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): RemoveConfirmedPackageDemandLineError => ({ code, message, cause, context });
