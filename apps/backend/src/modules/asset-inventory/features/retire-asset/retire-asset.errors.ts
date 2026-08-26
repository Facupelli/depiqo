import { ApplicationError } from 'src/core/errors/application-error';

export type RetireAssetErrorCode = 'asset_inventory.asset_not_found';

export interface RetireAssetError extends ApplicationError {
  code: RetireAssetErrorCode;
}

export const retireAssetError = (
  code: RetireAssetErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): RetireAssetError => ({ code, message, cause, context });
