import { ApplicationError } from 'src/core/errors/application-error';

export type AddRentalSelectionErrorCode =
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_cannot_be_edited_from_status'
  | 'rental_commitment.rental_period_ended'
  | 'rental_commitment.duplicate_rental_offer_selection'
  | 'rental_commitment.invalid_catalog_selection_quantity'
  | 'rental_commitment.rental_offer_not_found'
  | 'rental_commitment.catalog_selection_unavailable'
  | 'rental_commitment.invalid_fulfillment_definition'
  | 'rental_commitment.equipment_type_not_found'
  | 'rental_commitment.insufficient_asset_availability'
  | 'rental_commitment.tenant_unavailable'
  | 'rental_commitment.branch_unavailable'
  | 'rental_commitment.customer_unavailable'
  | 'rental_commitment.invalid_pricing_input'
  | 'rental_commitment.rental_version_conflict'
  | 'rental_commitment.invalid_rental_field';

export interface AddRentalSelectionError extends ApplicationError {
  code: AddRentalSelectionErrorCode;
}

export function addRentalSelectionError(
  code: AddRentalSelectionErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): AddRentalSelectionError {
  return { code, message, cause, context };
}
