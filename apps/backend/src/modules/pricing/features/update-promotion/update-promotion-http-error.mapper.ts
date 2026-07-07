import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

import {
  UpdatePromotionApplicationError,
  UpdatePromotionApplicationErrorCode,
} from './update-promotion-application.error';

interface UpdatePromotionProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const UpdatePromotionProblemCatalog: Record<UpdatePromotionApplicationErrorCode, UpdatePromotionProblemDefinition> = {
  PromotionNotFound: {
    type: createProblemType('pricing/promotion-not-found'),
    title: 'Promotion not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The promotion could not be found.',
  },
  InvalidPromotionConfiguration: {
    type: createProblemType('pricing/invalid-promotion-configuration'),
    title: 'Invalid promotion configuration',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The promotion could not be updated because it violates pricing rules.',
  },
  DuplicatePromotionTarget: {
    type: createProblemType('pricing/duplicate-promotion-target'),
    title: 'Duplicate promotion target',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The promotion contains duplicate scope or exclusion targets.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toUpdatePromotionProblem(error: UpdatePromotionApplicationError): ProblemException {
  const definition = UpdatePromotionProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
