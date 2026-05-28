import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

import {
  GetRentalAccessoryDefaultsApplicationError,
  GetRentalAccessoryDefaultsApplicationErrorCode,
} from './get-rental-accessory-defaults-application.error';

interface GetRentalAccessoryDefaultsProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const GetRentalAccessoryDefaultsProblemCatalog: Record<
  GetRentalAccessoryDefaultsApplicationErrorCode,
  GetRentalAccessoryDefaultsProblemDefinition
> = {
  RentalNotFound: {
    type: createV2ProblemType('asset-inventory/rental-not-found'),
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental could not be found.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toGetRentalAccessoryDefaultsProblem(
  error: GetRentalAccessoryDefaultsApplicationError,
): V2ProblemException {
  const definition = GetRentalAccessoryDefaultsProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
