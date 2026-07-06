import {
  ActiveOwnerContractNotFoundError,
  AssetInventoryError,
  MultipleActiveOwnerContractsError,
} from '../../../asset-inventory/domain/errors/asset-inventory.errors';
import { CatalogError } from '../../../catalog/domain/errors/catalog.errors';
import { RentalCommitmentError } from '../../../rental-commitment/domain/errors/rental-commitment.errors';
import { OfferingSetupApplicationError, offeringSetupApplicationError } from '../offering-setup-application.error';

export function mapTenantManagementError(error: RentalCommitmentError): OfferingSetupApplicationError {
  return offeringSetupApplicationError('TenantValidationFailed', error.message, error);
}

export function mapAssetInventoryError(error: AssetInventoryError): OfferingSetupApplicationError {
  if (error instanceof ActiveOwnerContractNotFoundError) {
    return offeringSetupApplicationError('ActiveOwnerContractNotFound', error.message, error);
  }

  if (error instanceof MultipleActiveOwnerContractsError) {
    return offeringSetupApplicationError('MultipleActiveOwnerContracts', error.message, error);
  }

  return offeringSetupApplicationError('AssetInventorySetupFailed', error.message, error);
}

export function mapCatalogError(error: CatalogError): OfferingSetupApplicationError {
  return offeringSetupApplicationError('CatalogSetupFailed', error.message, error);
}
