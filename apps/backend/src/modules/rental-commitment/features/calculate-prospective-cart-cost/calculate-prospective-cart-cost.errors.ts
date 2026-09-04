import { ApplicationError } from 'src/core/errors/application-error';

export type CalculateProspectiveCartCostErrorCode =
  | 'rental_commitment.invalid_prospective_cart'
  | 'rental_commitment.branch_not_found'
  | 'rental_commitment.tenant_config_unavailable'
  | 'rental_commitment.rental_offer_not_found'
  | 'rental_commitment.rental_offer_not_selectable'
  | 'rental_commitment.invalid_pricing_input'
  | 'rental_commitment.coupon_not_applicable'
  | 'rental_commitment.pricing_unavailable';

export interface CalculateProspectiveCartCostError extends ApplicationError {
  code: CalculateProspectiveCartCostErrorCode;
}

export function calculateProspectiveCartCostError(
  code: CalculateProspectiveCartCostErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CalculateProspectiveCartCostError {
  return { code, message, cause, context };
}
