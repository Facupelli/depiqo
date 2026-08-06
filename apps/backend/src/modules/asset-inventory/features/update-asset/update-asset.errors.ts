import { ApplicationError } from 'src/core/errors/application-error';
import { DuplicateAssetSerialNumberError } from '../../domain/errors/asset-inventory.errors';

export type UpdateAssetErrorCode =
  | 'asset_inventory.asset_not_found'
  | 'asset_inventory.duplicate_asset_serial_number';

export interface UpdateAssetError extends ApplicationError {
  code: UpdateAssetErrorCode;
}

export const updateAssetError = (
  code: UpdateAssetErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): UpdateAssetError => ({ code, message, cause, context });

export function duplicateAssetSerialNumberError(serialNumber: string): UpdateAssetError {
  const error = new DuplicateAssetSerialNumberError(serialNumber);
  return updateAssetError('asset_inventory.duplicate_asset_serial_number', error.message, error, { serialNumber });
}
