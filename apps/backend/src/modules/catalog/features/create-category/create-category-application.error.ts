export type CreateCategoryApplicationErrorCode = 'CategorySlugAlreadyInUse' | 'Unexpected';

export interface CreateCategoryApplicationError {
  code: CreateCategoryApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function createCategoryApplicationError(
  code: CreateCategoryApplicationErrorCode,
  message: string,
  cause?: unknown,
): CreateCategoryApplicationError {
  return { code, message, cause };
}
