import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type UpdateRentableItemDefinitionErrorCode =
  | 'catalog.rentable_item_not_found'
  | 'catalog.rentable_item_archived'
  | 'catalog.rentable_item_invalid_definition'
  | 'catalog.category_not_found'
  | 'catalog.category_inactive'
  | 'catalog.equipment_type_not_found';

export interface UpdateRentableItemDefinitionError extends ApplicationError {
  code: UpdateRentableItemDefinitionErrorCode;
}

export function updateRentableItemDefinitionError(
  code: UpdateRentableItemDefinitionErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): UpdateRentableItemDefinitionError {
  return { code, message, cause, context };
}
