export type OfferingSetupApplicationErrorCode =
  | 'TenantValidationFailed'
  | 'AssetInventorySetupFailed'
  | 'ActiveOwnerContractNotFound'
  | 'MultipleActiveOwnerContracts'
  | 'CatalogSetupFailed'
  | 'PricingSetupFailed'
  | 'Unexpected';

export interface OfferingSetupApplicationError {
  code: OfferingSetupApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function offeringSetupApplicationError(
  code: OfferingSetupApplicationErrorCode,
  message: string,
  cause?: unknown,
): OfferingSetupApplicationError {
  return { code, message, cause };
}
