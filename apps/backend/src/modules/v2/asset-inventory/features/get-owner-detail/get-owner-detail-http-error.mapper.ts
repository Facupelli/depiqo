import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

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
    type: createV2ProblemType('asset-inventory/owner-not-found'),
    title: 'Owner not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested owner could not be found.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toGetOwnerDetailProblem(error: GetOwnerDetailApplicationError): V2ProblemException {
  const definition = GetOwnerDetailProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
