import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

import { CustomDomainApplicationError, CustomDomainApplicationErrorCode } from './custom-domain-application.error';

interface ProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const CustomDomainProblemCatalog: Record<CustomDomainApplicationErrorCode, ProblemDefinition> = {
  InvalidCustomDomain: {
    type: createProblemType('tenant-management/invalid-custom-domain'),
    title: 'Custom domain is invalid',
    status: HttpStatus.BAD_REQUEST,
    detail: 'The custom domain is invalid.',
  },
  UnsupportedApexCustomDomain: {
    type: createProblemType('tenant-management/unsupported-apex-custom-domain'),
    title: 'Apex custom domain is not supported',
    status: HttpStatus.BAD_REQUEST,
    detail: 'Only subdomain custom domains are supported.',
  },
  TenantNotFound: {
    type: createProblemType('tenant-management/tenant-not-found'),
    title: 'Tenant not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The current tenant was not found.',
  },
  CustomDomainAlreadyInUse: {
    type: createProblemType('tenant-management/custom-domain-already-in-use'),
    title: 'Custom domain already in use',
    status: HttpStatus.CONFLICT,
    detail: 'The requested custom domain is already in use.',
  },
  TenantAlreadyHasCustomDomain: {
    type: createProblemType('tenant-management/tenant-already-has-custom-domain'),
    title: 'Tenant already has a custom domain',
    status: HttpStatus.CONFLICT,
    detail: 'The current tenant already has a custom domain.',
  },
  CustomDomainNotFound: {
    type: createProblemType('tenant-management/custom-domain-not-found'),
    title: 'Custom domain not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'No custom domain was found for the current tenant.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toCustomDomainProblem(error: CustomDomainApplicationError): ProblemException {
  const definition = CustomDomainProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
