import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

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
    type: createV2ProblemType('catalog/rentable-item-not-found'),
    title: 'Rentable item not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rentable item could not be found.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toGetRentableItemDetailProblem(error: GetRentableItemDetailApplicationError): V2ProblemException {
  const definition = GetRentableItemDetailProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
