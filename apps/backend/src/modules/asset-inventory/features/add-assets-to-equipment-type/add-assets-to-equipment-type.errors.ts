import { ApplicationError } from 'src/core/errors/application-error';

import {
  ActiveOwnerContractNotFoundError,
  AssetInventoryError,
  AssetOwnerNotFoundError,
  EquipmentTypeNotActiveError,
  EquipmentTypeNotFoundError,
  InvalidAssetFieldError,
  MultipleActiveOwnerContractsError,
} from '../../domain/errors/asset-inventory.errors';

export type AddAssetsToEquipmentTypeErrorCode =
  | 'asset_inventory.tenant_validation_failed'
  | 'asset_inventory.equipment_type_not_found'
  | 'asset_inventory.equipment_type_not_active'
  | 'asset_inventory.invalid_asset_field'
  | 'asset_inventory.asset_owner_not_found'
  | 'asset_inventory.active_owner_contract_not_found'
  | 'asset_inventory.multiple_active_owner_contracts';

export interface AddAssetsToEquipmentTypeError extends ApplicationError {
  code: AddAssetsToEquipmentTypeErrorCode;
}

export function addAssetsToEquipmentTypeError(
  code: AddAssetsToEquipmentTypeErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): AddAssetsToEquipmentTypeError {
  return { code, message, cause, context };
}

export function mapTenantValidationError(error: unknown): AddAssetsToEquipmentTypeError {
  return addAssetsToEquipmentTypeError(
    'asset_inventory.tenant_validation_failed',
    'The tenant or selected branches are not available for asset creation.',
    error,
  );
}

export function mapAssetInventoryError(error: AssetInventoryError): AddAssetsToEquipmentTypeError {
  if (error instanceof EquipmentTypeNotFoundError) {
    return addAssetsToEquipmentTypeError('asset_inventory.equipment_type_not_found', error.message, error, {
      equipmentTypeId: error.equipmentTypeId,
    });
  }

  if (error instanceof EquipmentTypeNotActiveError) {
    return addAssetsToEquipmentTypeError('asset_inventory.equipment_type_not_active', error.message, error, {
      equipmentTypeId: error.equipmentTypeId,
    });
  }

  if (error instanceof InvalidAssetFieldError) {
    return addAssetsToEquipmentTypeError('asset_inventory.invalid_asset_field', error.message, error, {
      field: error.field,
      reason: error.reason,
    });
  }

  if (error instanceof AssetOwnerNotFoundError) {
    return addAssetsToEquipmentTypeError('asset_inventory.asset_owner_not_found', error.message, error, {
      ownerId: error.ownerId,
    });
  }

  if (error instanceof ActiveOwnerContractNotFoundError) {
    return addAssetsToEquipmentTypeError('asset_inventory.active_owner_contract_not_found', error.message, error, {
      ownerId: error.ownerId,
    });
  }

  if (error instanceof MultipleActiveOwnerContractsError) {
    return addAssetsToEquipmentTypeError('asset_inventory.multiple_active_owner_contracts', error.message, error, {
      ownerId: error.ownerId,
    });
  }

  throw error;
}
