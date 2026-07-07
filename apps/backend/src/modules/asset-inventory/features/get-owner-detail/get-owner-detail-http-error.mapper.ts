import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

import {
  GetOwnerDetailApplicationError,
  GetOwnerDetailApplicationErrorCode,
} from './get-owner-detail-application.error';

interface GetOwnerDetailProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const GetOwnerDetailProblemCatalog: Record<GetOwnerDetailApplicationErrorCode, GetOwnerDetailProblemDefinition> = {
  OwnerNotFound: {
    type: createProblemType('asset-inventory/owner-not-found'),
    title: 'Owner not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested owner could not be found.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toGetOwnerDetailProblem(error: GetOwnerDetailApplicationError): ProblemException {
  const definition = GetOwnerDetailProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
