import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

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

export function toUpdateTenantBrandingProblem(error: UpdateTenantBrandingApplicationError): ProblemException {
  const definition = UpdateTenantBrandingProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
