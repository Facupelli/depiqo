import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type GetRentableItemDetailErrorCode = 'catalog.rentable_item_not_found';

export interface GetRentableItemDetailError extends ApplicationError {
  code: GetRentableItemDetailErrorCode;
}

export function getRentableItemDetailError(
  code: GetRentableItemDetailErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): GetRentableItemDetailError {
  return { code, message, cause, context };
}
