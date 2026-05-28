import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

import {
  UpdateTenantConfigApplicationError,
  UpdateTenantConfigApplicationErrorCode,
} from './update-tenant-config-application.error';

interface UpdateTenantConfigProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const UpdateTenantConfigProblemCatalog: Record<
  UpdateTenantConfigApplicationErrorCode,
  UpdateTenantConfigProblemDefinition
> = {
  TenantNotFound: {
    type: createV2ProblemType('tenant-management/tenant-not-found'),
    title: 'Tenant not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The current tenant could not be found.',
  },
  InvalidTenantConfig: {
    type: createV2ProblemType('tenant-management/invalid-tenant-config'),
    title: 'Invalid tenant config',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The tenant config update contains invalid values.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toUpdateTenantConfigProblem(error: UpdateTenantConfigApplicationError): V2ProblemException {
  const definition = UpdateTenantConfigProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
