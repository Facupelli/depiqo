import { ApplicationError } from 'src/core/errors/application-error';

export type CreateDraftRentalErrorCode =
  | 'rental_commitment.invalid_rental_period'
  | 'rental_commitment.rental_requires_selection'
  | 'rental_commitment.rental_offer_not_found'
  | 'rental_commitment.catalog_selection_unavailable'
  | 'rental_commitment.invalid_fulfillment_definition'
  | 'rental_commitment.duplicate_rental_offer_selection'
  | 'rental_commitment.tenant_unavailable'
  | 'rental_commitment.branch_unavailable'
  | 'rental_commitment.customer_unavailable'
  | 'rental_commitment.equipment_type_not_found'
  | 'rental_commitment.equipment_type_not_rentable'
  | 'rental_commitment.unsupported_branch_fulfillment_method'
  | 'rental_commitment.invalid_rental_field'
  | 'rental_commitment.invalid_catalog_selection_quantity'
  | 'rental_commitment.invalid_pricing_input';

export interface CreateDraftRentalError extends ApplicationError {
  code: CreateDraftRentalErrorCode;
}

export function createDraftRentalError(
  code: CreateDraftRentalErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CreateDraftRentalError {
  return { code, message, cause, context };
}
