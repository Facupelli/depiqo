import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type RetireAssetErrorCode = 'asset_inventory.asset_not_found';

export interface RetireAssetError extends ApplicationError {
  code: RetireAssetErrorCode;
}

export const retireAssetError = (
  code: RetireAssetErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): RetireAssetError => ({ code, message, cause, context });
