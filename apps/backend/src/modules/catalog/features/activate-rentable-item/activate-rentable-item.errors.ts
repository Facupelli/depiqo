import { ApplicationError } from 'src/core/errors/application-error';

export type ActivateRentableItemErrorCode =
  | 'catalog.rentable_item_not_found'
  | 'catalog.rentable_item_not_in_draft_status'
  | 'catalog.rentable_item_has_no_requirements'
  | 'catalog.rentable_item_has_no_rental_offers'
  | 'catalog.rentable_item_has_no_active_pricing'
  | 'catalog.rentable_item_has_insufficient_active_assets';

export interface ActivateRentableItemError extends ApplicationError {
  code: ActivateRentableItemErrorCode;
}

export function activateRentableItemError(
  code: ActivateRentableItemErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): ActivateRentableItemError {
  return { code, message, cause, context };
}
