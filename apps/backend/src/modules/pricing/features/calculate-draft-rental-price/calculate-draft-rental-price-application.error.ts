export type CalculateDraftRentalPriceApplicationErrorCode =
  | 'InvalidDraftRentalPricingInput'
  | 'RentalPeriodInvalid'
  | 'BranchNotFound'
  | 'TenantPricingConfigUnavailable'
  | 'RentalOfferNotFound'
  | 'MissingActivePricing'
  | 'PricingCalculationFailed'
  | 'Unexpected';

export interface CalculateDraftRentalPriceApplicationError {
  code: CalculateDraftRentalPriceApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function calculateDraftRentalPriceApplicationError(
  code: CalculateDraftRentalPriceApplicationErrorCode,
  message: string,
  cause?: unknown,
): CalculateDraftRentalPriceApplicationError {
  return { code, message, cause };
}
