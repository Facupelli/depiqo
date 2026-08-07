import { ApplicationError } from 'src/core/errors/application-error';

export type AssignRentalAccessoriesErrorCode =
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_status_does_not_allow_accessory_assignment'
  | 'rental_commitment.invalid_accessory_quantity'
  | 'rental_commitment.duplicate_accessory_selection'
  | 'rental_commitment.insufficient_asset_availability'
  | 'rental_commitment.source_rental_demand_line_not_found'
  | 'rental_commitment.rental_version_conflict';

export interface AssignRentalAccessoriesError extends ApplicationError {
  code: AssignRentalAccessoriesErrorCode;
}

export function assignRentalAccessoriesError(
  code: AssignRentalAccessoriesErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): AssignRentalAccessoriesError {
  return { code, message, cause, context };
}
