import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type GetOwnerDetailErrorCode = 'asset_inventory.owner_not_found';

export interface GetOwnerDetailError extends ApplicationError {
  code: GetOwnerDetailErrorCode;
}

export function getOwnerDetailError(
  code: GetOwnerDetailErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): GetOwnerDetailError {
  return { code, message, cause, context };
}
