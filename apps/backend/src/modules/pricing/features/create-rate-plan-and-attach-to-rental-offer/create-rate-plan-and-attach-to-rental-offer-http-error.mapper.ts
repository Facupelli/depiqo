import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

import {
  CreateRatePlanAndAttachToRentalOfferApplicationError,
  CreateRatePlanAndAttachToRentalOfferApplicationErrorCode,
} from './create-rate-plan-and-attach-to-rental-offer-application.error';

interface CreateRatePlanAndAttachToRentalOfferProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const CreateRatePlanAndAttachToRentalOfferProblemCatalog: Record<
  CreateRatePlanAndAttachToRentalOfferApplicationErrorCode,
  CreateRatePlanAndAttachToRentalOfferProblemDefinition
> = {
  RentalOfferNotFound: {
    type: createProblemType('pricing/rental-offer-not-found'),
    title: 'Rental offer not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental offer was not found.',
  },
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

export function toCreateRatePlanAndAttachToRentalOfferProblem(
  error: CreateRatePlanAndAttachToRentalOfferApplicationError,
): ProblemException {
  const definition = CreateRatePlanAndAttachToRentalOfferProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
