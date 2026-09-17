import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type UpdateAssetErrorCode = 'asset_inventory.asset_not_found';

export interface UpdateAssetError extends ApplicationError {
  code: UpdateAssetErrorCode;
}

export const updateAssetError = (
  code: UpdateAssetErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): UpdateAssetError => ({ code, message, cause, context });
