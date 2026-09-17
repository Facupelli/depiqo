import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type DeactivateAssetErrorCode =
  | 'asset_inventory.asset_not_found'
  | 'asset_inventory.invalid_asset_lifecycle_transition';

export interface DeactivateAssetError extends ApplicationError {
  code: DeactivateAssetErrorCode;
}

export const deactivateAssetError = (
  code: DeactivateAssetErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): DeactivateAssetError => ({ code, message, cause, context });
