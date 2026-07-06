import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

import {
  CreatePromotionApplicationError,
  CreatePromotionApplicationErrorCode,
} from './create-promotion-application.error';

interface CreatePromotionProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const CreatePromotionProblemCatalog: Record<CreatePromotionApplicationErrorCode, CreatePromotionProblemDefinition> = {
  InvalidPromotionConfiguration: {
    type: createV2ProblemType('pricing/invalid-promotion-configuration'),
    title: 'Invalid promotion configuration',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The promotion could not be created because it violates pricing rules.',
  },
  DuplicatePromotionTarget: {
    type: createV2ProblemType('pricing/duplicate-promotion-target'),
    title: 'Duplicate promotion target',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The promotion contains duplicate scope or exclusion targets.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toCreatePromotionProblem(error: CreatePromotionApplicationError): V2ProblemException {
  const definition = CreatePromotionProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
