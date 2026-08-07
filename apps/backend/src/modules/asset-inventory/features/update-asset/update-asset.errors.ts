import { ApplicationError } from 'src/core/errors/application-error';

export type UpdateAssetErrorCode = 'asset_inventory.asset_not_found';

export interface UpdateAssetError extends ApplicationError {
  code: UpdateAssetErrorCode;
}

export const updateAssetError = (
  code: UpdateAssetErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): UpdateAssetError => ({ code, message, cause, context });
