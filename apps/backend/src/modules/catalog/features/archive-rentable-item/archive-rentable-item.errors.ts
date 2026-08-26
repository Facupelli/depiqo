import { ApplicationError } from 'src/core/errors/application-error';

export type ArchiveRentableItemErrorCode = 'catalog.rentable_item_not_found';

export interface ArchiveRentableItemError extends ApplicationError {
  code: ArchiveRentableItemErrorCode;
}

export function archiveRentableItemError(
  code: ArchiveRentableItemErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): ArchiveRentableItemError {
  return { code, message, cause, context };
}
