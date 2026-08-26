import { ApplicationError } from 'src/core/errors/application-error';

export type GetReplacementAssetCandidatesErrorCode =
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_cannot_be_edited_from_status'
  | 'rental_commitment.rental_period_ended'
  | 'rental_commitment.rental_asset_assignment_not_found'
  | 'rental_commitment.invalid_rental_field';

export interface GetReplacementAssetCandidatesError extends ApplicationError {
  code: GetReplacementAssetCandidatesErrorCode;
}

export function getReplacementAssetCandidatesError(
  code: GetReplacementAssetCandidatesErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): GetReplacementAssetCandidatesError {
  return { code, message, cause, context };
}
