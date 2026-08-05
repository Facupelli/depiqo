import { ApplicationError } from 'src/core/errors/application-error';

export type CalculateDraftRentalPriceErrorCode =
  | 'pricing.invalid_draft_rental_selection'
  | 'pricing.invalid_rental_period'
  | 'pricing.branch_not_found'
  | 'pricing.tenant_config_unavailable'
  | 'pricing.rental_offer_not_found'
  | 'pricing.rental_offer_not_selectable'
  | 'pricing.rentable_item_inactive'
  | 'pricing.missing_active_pricing'
  | 'pricing.invalid_pricing_configuration';

export interface CalculateDraftRentalPriceError extends ApplicationError {
  code: CalculateDraftRentalPriceErrorCode;
}

export function calculateDraftRentalPriceError(
  code: CalculateDraftRentalPriceErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CalculateDraftRentalPriceError {
  return { code, message, cause, context };
}
