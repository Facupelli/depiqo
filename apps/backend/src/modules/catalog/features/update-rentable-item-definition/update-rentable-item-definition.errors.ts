import { ApplicationError } from 'src/core/errors/application-error';

export type UpdateRentableItemDefinitionErrorCode =
  | 'catalog.rentable_item_not_found'
  | 'catalog.rentable_item_archived'
  | 'catalog.rentable_item_invalid_definition'
  | 'catalog.category_not_found'
  | 'catalog.equipment_type_not_found'
  | 'catalog.equipment_type_not_active';

export interface UpdateRentableItemDefinitionError extends ApplicationError {
  code: UpdateRentableItemDefinitionErrorCode;
}

export function updateRentableItemDefinitionError(
  code: UpdateRentableItemDefinitionErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): UpdateRentableItemDefinitionError {
  return { code, message, cause, context };
}
