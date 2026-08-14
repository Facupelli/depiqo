import { ApplicationError } from 'src/core/errors/application-error';

export type CreateConfirmedRentalErrorCode =
  | 'rental_commitment.invalid_rental_period'
  | 'rental_commitment.rental_requires_selection'
  | 'rental_commitment.rental_offer_not_found'
  | 'rental_commitment.catalog_selection_unavailable'
  | 'rental_commitment.invalid_fulfillment_definition'
  | 'rental_commitment.duplicate_rental_offer_selection'
  | 'rental_commitment.insufficient_asset_availability'
  | 'rental_commitment.confirmed_rental_creation_disabled'
  | 'rental_commitment.tenant_unavailable'
  | 'rental_commitment.branch_unavailable'
  | 'rental_commitment.customer_unavailable'
  | 'rental_commitment.equipment_type_not_found'
  | 'rental_commitment.equipment_type_not_rentable'
  | 'rental_commitment.unsupported_branch_fulfillment_method'
  | 'rental_commitment.pickup_time_outside_branch_schedule'
  | 'rental_commitment.return_time_outside_branch_schedule'
  | 'rental_commitment.invalid_rental_field'
  | 'rental_commitment.invalid_catalog_selection_quantity'
  | 'rental_commitment.invalid_pricing_input'
  | 'rental_commitment.duplicate_assigned_asset';

export interface CreateConfirmedRentalError extends ApplicationError {
  code: CreateConfirmedRentalErrorCode;
}

export function createConfirmedRentalError(
  code: CreateConfirmedRentalErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CreateConfirmedRentalError {
  return { code, message, cause, context };
}
