import { ApplicationError } from 'src/core/errors/application-error';

export type EditUnconfirmedRentalErrorCode =
  | 'rental_commitment.invalid_rental_period'
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_cannot_be_edited_from_status'
  | 'rental_commitment.rental_contains_operational_commitments'
  | 'rental_commitment.rental_version_conflict'
  | 'rental_commitment.rental_requires_selection'
  | 'rental_commitment.duplicate_rental_offer_selection'
  | 'rental_commitment.tenant_unavailable'
  | 'rental_commitment.branch_unavailable'
  | 'rental_commitment.customer_unavailable'
  | 'rental_commitment.unsupported_branch_fulfillment_method'
  | 'rental_commitment.pickup_time_outside_branch_schedule'
  | 'rental_commitment.return_time_outside_branch_schedule'
  | 'rental_commitment.invalid_rental_field'
  | 'rental_commitment.invalid_catalog_selection_quantity'
  | 'rental_commitment.invalid_pricing_input';

export interface EditUnconfirmedRentalError extends ApplicationError {
  code: EditUnconfirmedRentalErrorCode;
}

export function editUnconfirmedRentalError(
  code: EditUnconfirmedRentalErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): EditUnconfirmedRentalError {
  return { code, message, cause, context };
}
