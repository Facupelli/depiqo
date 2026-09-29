import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';
import { RentalProposalResolutionErrorCode } from '../../application/rental-proposal-resolver.service';

export type UpdateDraftRentalErrorCode =
  | RentalProposalResolutionErrorCode
  | 'rental_commitment.tenant_unavailable'
  | 'rental_commitment.branch_unavailable'
  | 'rental_commitment.customer_unavailable'
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
  context?: ApplicationErrorContext,
): UpdateDraftRentalError {
  return { code, message, cause, context };
}
