import { ApplicationError } from 'src/core/errors/application-error';

export type CalculateCartPriceErrorCode =
  | 'pricing.invalid_cart_selection'
  | 'pricing.rental_offer_not_found'
  | 'pricing.rental_offer_not_selectable'
  | 'pricing.rentable_item_inactive'
  | 'pricing.invalid_rental_period'
  | 'pricing.branch_not_found'
  | 'pricing.tenant_config_unavailable'
  | 'pricing.missing_active_pricing'
  | 'pricing.coupon_requires_customer'
  | 'pricing.coupon_not_applicable';

export interface CalculateCartPriceError extends ApplicationError {
  code: CalculateCartPriceErrorCode;
}

export function calculateCartPriceError(
  code: CalculateCartPriceErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CalculateCartPriceError {
  return { code, message, cause, context };
}
