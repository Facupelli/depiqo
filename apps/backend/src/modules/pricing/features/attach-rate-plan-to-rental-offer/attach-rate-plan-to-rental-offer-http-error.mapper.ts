import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

import {
  AttachRatePlanToRentalOfferApplicationError,
  AttachRatePlanToRentalOfferApplicationErrorCode,
} from './attach-rate-plan-to-rental-offer-application.error';

interface AttachRatePlanToRentalOfferProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const AttachRatePlanToRentalOfferProblemCatalog: Record<
  AttachRatePlanToRentalOfferApplicationErrorCode,
  AttachRatePlanToRentalOfferProblemDefinition
> = {
  RentalOfferNotFound: {
    type: createProblemType('pricing/rental-offer-not-found'),
    title: 'Rental offer not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental offer was not found.',
  },
  RatePlanNotFound: {
    type: createProblemType('pricing/rate-plan-not-found'),
    title: 'Rate plan not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rate plan was not found.',
  },
  RatePlanInactive: {
    type: createProblemType('pricing/rate-plan-inactive'),
    title: 'Rate plan inactive',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rate plan must be active before it can price a rental offer.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toAttachRatePlanToRentalOfferProblem(
  error: AttachRatePlanToRentalOfferApplicationError,
): ProblemException {
  const definition = AttachRatePlanToRentalOfferProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
