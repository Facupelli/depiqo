import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

import {
  GetRentalDetailApplicationError,
  GetRentalDetailApplicationErrorCode,
} from './get-rental-detail-application.error';

interface GetRentalDetailProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const GetRentalDetailProblemCatalog: Record<GetRentalDetailApplicationErrorCode, GetRentalDetailProblemDefinition> = {
  RentalNotFound: {
    type: createProblemType('rental-commitment/rental-not-found'),
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental was not found.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toGetRentalDetailProblem(error: GetRentalDetailApplicationError): ProblemException {
  const definition = GetRentalDetailProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
