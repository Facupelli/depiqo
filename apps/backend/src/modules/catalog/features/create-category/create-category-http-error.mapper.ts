import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

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
    type: createV2ProblemType('catalog/category-slug-already-in-use'),
    title: 'Category slug already in use',
    status: HttpStatus.CONFLICT,
    detail: 'A category with the requested slug already exists.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toCreateCategoryProblem(error: CreateCategoryApplicationError): V2ProblemException {
  const definition = CreateCategoryProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
