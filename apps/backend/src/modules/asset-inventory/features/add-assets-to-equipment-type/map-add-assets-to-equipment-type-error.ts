import {
  ActiveOwnerContractNotFoundError,
  AssetInventoryError,
  AssetOwnerNotFoundError,
  DuplicateAssetSerialNumberError,
  EquipmentTypeNotActiveError,
  EquipmentTypeNotFoundError,
  InvalidAssetFieldError,
  MultipleActiveOwnerContractsError,
} from '../../domain/errors/asset-inventory.errors';
import { RentalCommitmentError } from '../../../rental-commitment/domain/errors/rental-commitment.errors';
import {
  AddAssetsToEquipmentTypeApplicationError,
  addAssetsToEquipmentTypeApplicationError,
} from './add-assets-to-equipment-type-application.error';

export function mapTenantManagementError(error: RentalCommitmentError): AddAssetsToEquipmentTypeApplicationError {
  return addAssetsToEquipmentTypeApplicationError('TenantValidationFailed', error.message, error);
}

export function mapAssetInventoryError(error: AssetInventoryError): AddAssetsToEquipmentTypeApplicationError {
  if (error instanceof EquipmentTypeNotFoundError) {
    return addAssetsToEquipmentTypeApplicationError('EquipmentTypeNotFound', error.message, error);
  }

  if (error instanceof EquipmentTypeNotActiveError) {
    return addAssetsToEquipmentTypeApplicationError('EquipmentTypeNotActive', error.message, error);
  }

  if (error instanceof InvalidAssetFieldError) {
    return addAssetsToEquipmentTypeApplicationError('InvalidAssetField', error.message, error);
  }

  if (error instanceof DuplicateAssetSerialNumberError) {
    return addAssetsToEquipmentTypeApplicationError('DuplicateAssetSerialNumber', error.message, error);
  }

  if (error instanceof AssetOwnerNotFoundError) {
    return addAssetsToEquipmentTypeApplicationError('AssetOwnerNotFound', error.message, error);
  }

  if (error instanceof ActiveOwnerContractNotFoundError) {
    return addAssetsToEquipmentTypeApplicationError('ActiveOwnerContractNotFound', error.message, error);
  }

  if (error instanceof MultipleActiveOwnerContractsError) {
    return addAssetsToEquipmentTypeApplicationError('MultipleActiveOwnerContracts', error.message, error);
  }

  return addAssetsToEquipmentTypeApplicationError('Unexpected', 'An unexpected asset inventory error occurred.', error);
}
