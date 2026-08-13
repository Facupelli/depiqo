import { ApplicationError } from 'src/core/errors/application-error';

export type EditConfirmedRentalErrorCode =
  | 'rental_commitment.invalid_rental_period'
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_cannot_be_edited_from_status'
  | 'rental_commitment.rental_cannot_be_edited_after_pickup'
  | 'rental_commitment.rental_version_conflict'
  | 'rental_commitment.rental_accessories_require_removal'
  | 'rental_commitment.rental_requires_selection'
  | 'rental_commitment.duplicate_rental_offer_selection'
  | 'rental_commitment.rental_offer_not_found'
  | 'rental_commitment.catalog_selection_unavailable'
  | 'rental_commitment.invalid_fulfillment_definition'
  | 'rental_commitment.insufficient_asset_availability'
  | 'rental_commitment.tenant_unavailable'
  | 'rental_commitment.branch_unavailable'
  | 'rental_commitment.customer_unavailable'
  | 'rental_commitment.unsupported_branch_fulfillment_method'
  | 'rental_commitment.pickup_time_outside_branch_schedule'
  | 'rental_commitment.return_time_outside_branch_schedule'
  | 'rental_commitment.invalid_rental_field'
  | 'rental_commitment.invalid_catalog_selection_quantity'
  | 'rental_commitment.invalid_pricing_input';

export interface EditConfirmedRentalError extends ApplicationError {
  code: EditConfirmedRentalErrorCode;
}

export function editConfirmedRentalError(
  code: EditConfirmedRentalErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): EditConfirmedRentalError {
  return { code, message, cause, context };
}
