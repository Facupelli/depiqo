import { ApplicationError } from 'src/core/errors/application-error';

import {
  ActiveOwnerContractNotFoundError,
  AssetInventoryError,
  AssetOwnerNotFoundError,
  InvalidAssetFieldError,
  MultipleActiveOwnerContractsError,
} from '../../domain/errors/asset-inventory.errors';

export type ChangeAssetOwnerErrorCode =
  | 'asset_inventory.asset_not_found'
  | 'asset_inventory.invalid_asset_field'
  | 'asset_inventory.asset_owner_not_found'
  | 'asset_inventory.active_owner_contract_not_found'
  | 'asset_inventory.multiple_active_owner_contracts';

export interface ChangeAssetOwnerError extends ApplicationError {
  code: ChangeAssetOwnerErrorCode;
}

export function changeAssetOwnerError(
  code: ChangeAssetOwnerErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): ChangeAssetOwnerError {
  return { code, message, cause, context };
}

export function mapAssetInventoryError(error: AssetInventoryError): ChangeAssetOwnerError {
  if (error instanceof InvalidAssetFieldError) {
    return changeAssetOwnerError('asset_inventory.invalid_asset_field', error.message, error, {
      field: error.field,
      reason: error.reason,
    });
  }

  if (error instanceof AssetOwnerNotFoundError) {
    return changeAssetOwnerError('asset_inventory.asset_owner_not_found', error.message, error, {
      ownerId: error.ownerId,
    });
  }

  if (error instanceof ActiveOwnerContractNotFoundError) {
    return changeAssetOwnerError('asset_inventory.active_owner_contract_not_found', error.message, error, {
      ownerId: error.ownerId,
    });
  }

  if (error instanceof MultipleActiveOwnerContractsError) {
    return changeAssetOwnerError('asset_inventory.multiple_active_owner_contracts', error.message, error, {
      ownerId: error.ownerId,
    });
  }

  throw error;
}
