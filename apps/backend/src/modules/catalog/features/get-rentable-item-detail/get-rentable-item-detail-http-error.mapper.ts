import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

import {
  GetRentableItemDetailApplicationError,
  GetRentableItemDetailApplicationErrorCode,
} from './get-rentable-item-detail-application.error';

interface GetRentableItemDetailProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const GetRentableItemDetailProblemCatalog: Record<
  GetRentableItemDetailApplicationErrorCode,
  GetRentableItemDetailProblemDefinition
> = {
  RentableItemNotFound: {
    type: createProblemType('catalog/rentable-item-not-found'),
    title: 'Rentable item not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rentable item could not be found.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toGetRentableItemDetailProblem(error: GetRentableItemDetailApplicationError): ProblemException {
  const definition = GetRentableItemDetailProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
