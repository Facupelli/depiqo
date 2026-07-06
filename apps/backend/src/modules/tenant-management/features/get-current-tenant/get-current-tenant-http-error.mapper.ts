import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

import {
  GetCurrentTenantApplicationError,
  GetCurrentTenantApplicationErrorCode,
} from './get-current-tenant-application.error';

interface GetCurrentTenantProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const GetCurrentTenantProblemCatalog: Record<GetCurrentTenantApplicationErrorCode, GetCurrentTenantProblemDefinition> =
  {
    TenantNotFound: {
      type: createV2ProblemType('tenant-management/tenant-not-found'),
      title: 'Tenant not found',
      status: HttpStatus.NOT_FOUND,
      detail: 'The current tenant could not be found.',
    },
    Unexpected: {
      type: V2PlatformProblemTypes.system.internalServerError,
      title: 'Internal server error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'An unexpected error occurred. Please try again later.',
    },
  };

export function toGetCurrentTenantProblem(error: GetCurrentTenantApplicationError): V2ProblemException {
  const definition = GetCurrentTenantProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
