import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

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
    type: createProblemType('tenant-management/tenant-not-found'),
    title: 'Tenant not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The current tenant could not be found.',
  },
  InvalidTenantConfig: {
    type: createProblemType('tenant-management/invalid-tenant-config'),
    title: 'Invalid tenant config',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The tenant config update contains invalid values.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toUpdateTenantConfigProblem(error: UpdateTenantConfigApplicationError): ProblemException {
  const definition = UpdateTenantConfigProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
