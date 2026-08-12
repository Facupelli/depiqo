import { ApplicationError } from 'src/core/errors/application-error';

import {
  ActiveOwnerContractNotFoundError,
  AssetInventoryError,
  AssetOwnerNotFoundError,
  DuplicateEquipmentTypeNameError,
  InvalidAssetFieldError,
  InvalidEquipmentTypeFieldError,
  MultipleActiveOwnerContractsError,
} from '../../domain/errors/asset-inventory.errors';

export type CreateEquipmentTypeErrorCode =
  | 'asset_inventory.category_not_found'
  | 'asset_inventory.category_inactive'
  | 'asset_inventory.tenant_validation_failed'
  | 'asset_inventory.invalid_equipment_type_field'
  | 'asset_inventory.duplicate_equipment_type_name'
  | 'asset_inventory.invalid_asset_field'
  | 'asset_inventory.asset_owner_not_found'
  | 'asset_inventory.active_owner_contract_not_found'
  | 'asset_inventory.multiple_active_owner_contracts';

export interface CreateEquipmentTypeError extends ApplicationError {
  code: CreateEquipmentTypeErrorCode;
}

export function createEquipmentTypeError(
  code: CreateEquipmentTypeErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CreateEquipmentTypeError {
  return { code, message, cause, context };
}

export function mapTenantValidationError(error: unknown): CreateEquipmentTypeError {
  return createEquipmentTypeError(
    'asset_inventory.tenant_validation_failed',
    'The tenant or selected branches are not available for asset creation.',
    error,
  );
}

export function mapAssetInventoryError(error: AssetInventoryError): CreateEquipmentTypeError {
  if (error instanceof InvalidEquipmentTypeFieldError) {
    return createEquipmentTypeError('asset_inventory.invalid_equipment_type_field', error.message, error, {
      field: error.field,
      reason: error.reason,
    });
  }

  if (error instanceof DuplicateEquipmentTypeNameError) {
    return createEquipmentTypeError('asset_inventory.duplicate_equipment_type_name', error.message, error, {
      name: error.name,
    });
  }

  if (error instanceof InvalidAssetFieldError) {
    return createEquipmentTypeError('asset_inventory.invalid_asset_field', error.message, error, {
      field: error.field,
      reason: error.reason,
    });
  }

  if (error instanceof AssetOwnerNotFoundError) {
    return createEquipmentTypeError('asset_inventory.asset_owner_not_found', error.message, error, {
      ownerId: error.ownerId,
    });
  }

  if (error instanceof ActiveOwnerContractNotFoundError) {
    return createEquipmentTypeError('asset_inventory.active_owner_contract_not_found', error.message, error, {
      ownerId: error.ownerId,
    });
  }

  if (error instanceof MultipleActiveOwnerContractsError) {
    return createEquipmentTypeError('asset_inventory.multiple_active_owner_contracts', error.message, error, {
      ownerId: error.ownerId,
    });
  }

  throw error;
}
