import {
  ActiveOwnerContractNotFoundError,
  AssetInventoryError,
  AssetOwnerNotFoundError,
  DuplicateAssetSerialNumberError,
  DuplicateEquipmentTypeNameError,
  InvalidAssetFieldError,
  InvalidEquipmentTypeFieldError,
  MultipleActiveOwnerContractsError,
} from '../../domain/errors/asset-inventory.errors';
import { RentalCommitmentError } from '../../../rental-commitment/domain/errors/rental-commitment.errors';
import {
  CreateEquipmentTypeApplicationError,
  createEquipmentTypeApplicationError,
} from './create-equipment-type-application.error';

export function mapTenantManagementError(error: RentalCommitmentError): CreateEquipmentTypeApplicationError {
  return createEquipmentTypeApplicationError('TenantValidationFailed', error.message, error);
}

export function mapAssetInventoryError(error: AssetInventoryError): CreateEquipmentTypeApplicationError {
  if (error instanceof InvalidEquipmentTypeFieldError) {
    return createEquipmentTypeApplicationError('InvalidEquipmentTypeField', error.message, error);
  }

  if (error instanceof DuplicateEquipmentTypeNameError) {
    return createEquipmentTypeApplicationError('DuplicateEquipmentTypeName', error.message, error);
  }

  if (error instanceof InvalidAssetFieldError) {
    return createEquipmentTypeApplicationError('InvalidAssetField', error.message, error);
  }

  if (error instanceof DuplicateAssetSerialNumberError) {
    return createEquipmentTypeApplicationError('DuplicateAssetSerialNumber', error.message, error);
  }

  if (error instanceof AssetOwnerNotFoundError) {
    return createEquipmentTypeApplicationError('AssetOwnerNotFound', error.message, error);
  }

  if (error instanceof ActiveOwnerContractNotFoundError) {
    return createEquipmentTypeApplicationError('ActiveOwnerContractNotFound', error.message, error);
  }

  if (error instanceof MultipleActiveOwnerContractsError) {
    return createEquipmentTypeApplicationError('MultipleActiveOwnerContracts', error.message, error);
  }

  return createEquipmentTypeApplicationError('Unexpected', 'An unexpected asset inventory error occurred.', error);
}
