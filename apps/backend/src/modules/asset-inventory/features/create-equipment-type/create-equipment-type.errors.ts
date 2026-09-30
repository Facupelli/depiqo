import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

import { AssetInventoryAuthoringError } from '../../public-api/asset-inventory-authoring.public-api';

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
  context?: ApplicationErrorContext,
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

export function mapAuthoringError(error: AssetInventoryAuthoringError): CreateEquipmentTypeError {
  const codes: Partial<Record<AssetInventoryAuthoringError['code'], CreateEquipmentTypeErrorCode>> = {
    CategoryNotFound: 'asset_inventory.category_not_found',
    CategoryInactive: 'asset_inventory.category_inactive',
    InvalidEquipmentTypeField: 'asset_inventory.invalid_equipment_type_field',
    DuplicateEquipmentTypeName: 'asset_inventory.duplicate_equipment_type_name',
    InvalidAssetField: 'asset_inventory.invalid_asset_field',
    AssetOwnerNotFound: 'asset_inventory.asset_owner_not_found',
    ActiveOwnerContractNotFound: 'asset_inventory.active_owner_contract_not_found',
    MultipleActiveOwnerContracts: 'asset_inventory.multiple_active_owner_contracts',
  };
  if (
    error.code === 'TenantUnavailable' ||
    error.code === 'BranchNotFound' ||
    error.code === 'BranchInactive' ||
    error.code === 'BranchDeleted' ||
    error.code === 'BranchReferenceUnavailable'
  ) {
    return mapTenantValidationError(error);
  }
  const code = codes[error.code];
  if (!code) throw error;
  return createEquipmentTypeError(code, error.message, error, error.details);
}
