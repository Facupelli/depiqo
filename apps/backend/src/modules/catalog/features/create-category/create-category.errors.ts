import { ApplicationError } from 'src/core/errors/application-error';

export type CreateCategoryErrorCode = 'catalog.category_slug_already_in_use';

export interface CreateCategoryError extends ApplicationError {
  code: CreateCategoryErrorCode;
}

export function createCategoryError(
  code: CreateCategoryErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CreateCategoryError {
  return { code, message, cause, context };
}
