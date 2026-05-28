export type CalculateCartPriceApplicationErrorCode =
  | 'InvalidCartSelection'
  | 'RentalOfferNotFound'
  | 'RentalOfferNotSelectable'
  | 'RentableItemInactive'
  | 'RentalPeriodInvalid'
  | 'BranchNotFound'
  | 'TenantPricingConfigUnavailable'
  | 'MissingActivePricing'
  | 'CouponRequiresCustomer'
  | 'CouponNotApplicable'
  | 'PricingCalculationFailed'
  | 'Unexpected';

export interface CalculateCartPriceApplicationError {
  code: CalculateCartPriceApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function calculateCartPriceApplicationError(
  code: CalculateCartPriceApplicationErrorCode,
  message: string,
  cause?: unknown,
): CalculateCartPriceApplicationError {
  return { code, message, cause };
}
