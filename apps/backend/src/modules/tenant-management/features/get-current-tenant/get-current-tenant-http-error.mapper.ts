import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

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
      type: createProblemType('tenant-management/tenant-not-found'),
      title: 'Tenant not found',
      status: HttpStatus.NOT_FOUND,
      detail: 'The current tenant could not be found.',
    },
    Unexpected: {
      type: PlatformProblemTypes.system.internalServerError,
      title: 'Internal server error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'An unexpected error occurred. Please try again later.',
    },
  };

export function toGetCurrentTenantProblem(error: GetCurrentTenantApplicationError): ProblemException {
  const definition = GetCurrentTenantProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
