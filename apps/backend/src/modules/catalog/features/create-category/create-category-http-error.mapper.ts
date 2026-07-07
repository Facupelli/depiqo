import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

import {
  CreateCategoryApplicationError,
  CreateCategoryApplicationErrorCode,
} from './create-category-application.error';

interface CreateCategoryProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const CreateCategoryProblemCatalog: Record<CreateCategoryApplicationErrorCode, CreateCategoryProblemDefinition> = {
  CategorySlugAlreadyInUse: {
    type: createProblemType('catalog/category-slug-already-in-use'),
    title: 'Category slug already in use',
    status: HttpStatus.CONFLICT,
    detail: 'A category with the requested slug already exists.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toCreateCategoryProblem(error: CreateCategoryApplicationError): ProblemException {
  const definition = CreateCategoryProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
