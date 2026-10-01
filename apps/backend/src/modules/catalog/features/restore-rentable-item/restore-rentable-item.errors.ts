import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type RestoreRentableItemErrorCode = 'catalog.rentable_item_not_found';

export interface RestoreRentableItemError extends ApplicationError {
  code: RestoreRentableItemErrorCode;
}

export function restoreRentableItemError(
  code: RestoreRentableItemErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): RestoreRentableItemError {
  return { code, message, cause, context };
}
