import { ApplicationError } from 'src/core/errors/application-error';
import { DraftRentalProposalResolutionErrorCode } from '../../application/draft-rental-proposal-resolver.service';

export type UpdateDraftRentalErrorCode =
  | DraftRentalProposalResolutionErrorCode
  | 'rental_commitment.invalid_rental_period'
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_cannot_be_edited_from_status'
  | 'rental_commitment.rental_version_conflict'
  | 'rental_commitment.current_delivery_destination_missing'
  | 'rental_commitment.unsafe_draft_state';

export interface UpdateDraftRentalError extends ApplicationError {
  code: UpdateDraftRentalErrorCode;
}

export function updateDraftRentalError(
  code: UpdateDraftRentalErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): UpdateDraftRentalError {
  return { code, message, cause, context };
}
