import { ApplicationError } from 'src/core/errors/application-error';

export type ConfirmRentalErrorCode =
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_cannot_be_confirmed_from_status'
  | 'rental_commitment.rental_confirmation_requires_customer'
  | 'rental_commitment.confirmed_rental_requires_price_snapshot'
  | 'rental_commitment.insufficient_asset_availability'
  | 'rental_commitment.duplicate_assigned_asset'
  | 'rental_commitment.invalid_rental_field'
  | 'rental_commitment.tenant_unavailable'
  | 'rental_commitment.branch_unavailable'
  | 'rental_commitment.customer_unavailable'
  | 'rental_commitment.unsupported_branch_fulfillment_method';

export interface ConfirmRentalError extends ApplicationError {
  code: ConfirmRentalErrorCode;
}

export function confirmRentalError(
  code: ConfirmRentalErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): ConfirmRentalError {
  return { code, message, cause, context };
}
