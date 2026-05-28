import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

import {
  CreateRatePlanApplicationError,
  CreateRatePlanApplicationErrorCode,
} from './create-rate-plan-application.error';

interface CreateRatePlanProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const CreateRatePlanProblemCatalog: Record<CreateRatePlanApplicationErrorCode, CreateRatePlanProblemDefinition> = {
  RatePlanNameAlreadyInUse: {
    type: createV2ProblemType('pricing/rate-plan-name-already-in-use'),
    title: 'Rate plan name already in use',
    status: HttpStatus.CONFLICT,
    detail: 'A rate plan with the requested name already exists.',
  },
  InvalidRatePlan: {
    type: createV2ProblemType('pricing/invalid-rate-plan'),
    title: 'Invalid rate plan',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rate plan could not be created because it violates pricing rules.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toCreateRatePlanProblem(error: CreateRatePlanApplicationError): V2ProblemException {
  const definition = CreateRatePlanProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
