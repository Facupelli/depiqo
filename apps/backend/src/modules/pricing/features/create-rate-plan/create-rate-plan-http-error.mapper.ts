import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

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
    type: createProblemType('pricing/rate-plan-name-already-in-use'),
    title: 'Rate plan name already in use',
    status: HttpStatus.CONFLICT,
    detail: 'A rate plan with the requested name already exists.',
  },
  InvalidRatePlan: {
    type: createProblemType('pricing/invalid-rate-plan'),
    title: 'Invalid rate plan',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rate plan could not be created because it violates pricing rules.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toCreateRatePlanProblem(error: CreateRatePlanApplicationError): ProblemException {
  const definition = CreateRatePlanProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
