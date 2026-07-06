import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

import {
  UpdateTenantBrandingApplicationError,
  UpdateTenantBrandingApplicationErrorCode,
} from './update-tenant-branding-application.error';

interface UpdateTenantBrandingProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const UpdateTenantBrandingProblemCatalog: Record<
  UpdateTenantBrandingApplicationErrorCode,
  UpdateTenantBrandingProblemDefinition
> = {
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

export function toUpdateTenantBrandingProblem(error: UpdateTenantBrandingApplicationError): V2ProblemException {
  const definition = UpdateTenantBrandingProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
