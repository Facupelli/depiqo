import { ApplicationError } from 'src/core/errors/application-error';

export type ReplaceConfirmedRentalAssetErrorCode =
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_cannot_be_edited_from_status'
  | 'rental_commitment.rental_period_ended'
  | 'rental_commitment.rental_asset_assignment_not_found'
  | 'rental_commitment.replacement_asset_unavailable'
  | 'rental_commitment.rental_version_conflict'
  | 'rental_commitment.invalid_rental_field';

export interface ReplaceConfirmedRentalAssetError extends ApplicationError {
  code: ReplaceConfirmedRentalAssetErrorCode;
}

export function replaceConfirmedRentalAssetError(
  code: ReplaceConfirmedRentalAssetErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): ReplaceConfirmedRentalAssetError {
  return { code, message, cause, context };
}
