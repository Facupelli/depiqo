import { CatalogError } from '../../../catalog/domain/errors/catalog.errors';
import { PricingPublicApiError } from '../../../pricing/public-api/pricing.public-api';
import { RentalCommitmentError } from '../../../rental-commitment/domain/errors/rental-commitment.errors';
import { OfferingSetupApplicationError, offeringSetupApplicationError } from '../offering-setup-application.error';

export function mapTenantManagementError(error: RentalCommitmentError): OfferingSetupApplicationError {
  return offeringSetupApplicationError('TenantValidationFailed', error.message, error);
}

export function mapCatalogError(error: CatalogError): OfferingSetupApplicationError {
  return offeringSetupApplicationError('CatalogSetupFailed', error.message, error);
}

export function mapPricingError(error: PricingPublicApiError): OfferingSetupApplicationError {
  return offeringSetupApplicationError('PricingSetupFailed', error.message, error);
}
