import { ApplicationError } from 'src/core/errors/application-error';

export type ReplaceRentalDemandLineAccessoriesErrorCode =
  | 'rental_commitment.rental_not_found'
  | 'rental_commitment.rental_status_does_not_allow_accessory_assignment'
  | 'rental_commitment.source_rental_demand_line_not_found'
  | 'rental_commitment.invalid_accessory_quantity'
  | 'rental_commitment.duplicate_accessory_selection'
  | 'rental_commitment.equipment_type_not_found'
  | 'rental_commitment.insufficient_asset_availability'
  | 'rental_commitment.asset_availability_changed'
  | 'rental_commitment.rental_version_conflict';

export interface ReplaceRentalDemandLineAccessoriesError extends ApplicationError {
  code: ReplaceRentalDemandLineAccessoriesErrorCode;
}

export function replaceRentalDemandLineAccessoriesError(
  code: ReplaceRentalDemandLineAccessoriesErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): ReplaceRentalDemandLineAccessoriesError {
  return { code, message, cause, context };
}
