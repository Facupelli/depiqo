import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

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
    type: createV2ProblemType('pricing/rental-offer-not-found'),
    title: 'Rental offer not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental offer was not found.',
  },
  RatePlanNotFound: {
    type: createV2ProblemType('pricing/rate-plan-not-found'),
    title: 'Rate plan not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rate plan was not found.',
  },
  RatePlanInactive: {
    type: createV2ProblemType('pricing/rate-plan-inactive'),
    title: 'Rate plan inactive',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rate plan must be active before it can price a rental offer.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toAttachRatePlanToRentalOfferProblem(
  error: AttachRatePlanToRentalOfferApplicationError,
): V2ProblemException {
  const definition = AttachRatePlanToRentalOfferProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
