import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type ReactivateAssetErrorCode =
  | 'asset_inventory.asset_not_found'
  | 'asset_inventory.invalid_asset_lifecycle_transition';

export interface ReactivateAssetError extends ApplicationError {
  code: ReactivateAssetErrorCode;
}

export const reactivateAssetError = (
  code: ReactivateAssetErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): ReactivateAssetError => ({ code, message, cause, context });
