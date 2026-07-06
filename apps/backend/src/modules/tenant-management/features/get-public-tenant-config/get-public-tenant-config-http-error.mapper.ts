import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

import {
  GetPublicTenantConfigApplicationError,
  GetPublicTenantConfigApplicationErrorCode,
} from './get-public-tenant-config-application.error';

interface GetPublicTenantConfigProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const GetPublicTenantConfigProblemCatalog: Record<
  GetPublicTenantConfigApplicationErrorCode,
  GetPublicTenantConfigProblemDefinition
> = {
  TenantNotFound: {
    type: createV2ProblemType('tenant-management/tenant-not-found'),
    title: 'Tenant not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The storefront tenant could not be found.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toGetPublicTenantConfigProblem(error: GetPublicTenantConfigApplicationError): V2ProblemException {
  const definition = GetPublicTenantConfigProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
