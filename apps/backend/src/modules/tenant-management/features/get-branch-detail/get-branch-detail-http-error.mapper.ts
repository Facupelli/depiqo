import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

import {
  TenantManagementApplicationError,
  TenantManagementApplicationErrorCode,
} from '../tenant-management-application.error';

interface GetBranchDetailProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const GetBranchDetailProblemCatalog: Record<TenantManagementApplicationErrorCode, GetBranchDetailProblemDefinition> = {
  TenantRegistrationInvalidInput: {
    type: createV2ProblemType('tenant-management/tenant-registration-invalid-input'),
    title: 'Tenant registration input is invalid',
    status: HttpStatus.BAD_REQUEST,
    detail: 'The tenant registration request contains invalid input.',
  },
  TenantSlugAlreadyInUse: {
    type: createV2ProblemType('tenant-management/tenant-slug-already-in-use'),
    title: 'Tenant slug already in use',
    status: HttpStatus.CONFLICT,
    detail: 'A tenant with the requested name already exists.',
  },
  BranchNotFound: {
    type: createV2ProblemType('tenant-management/branch-not-found'),
    title: 'Branch not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested branch was not found.',
  },
  BranchInvalidInput: {
    type: createV2ProblemType('tenant-management/branch-invalid-input'),
    title: 'Branch input is invalid',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The branch request contains invalid input.',
  },
  BranchScheduleInvalidInput: {
    type: createV2ProblemType('tenant-management/branch-schedule-invalid-input'),
    title: 'Branch schedule input is invalid',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The branch schedule request contains invalid input.',
  },
  RentalCustomerNotFound: {
    type: createV2ProblemType('tenant-management/rental-customer-not-found'),
    title: 'Rental customer not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental customer was not found.',
  },
  CustomerProfileNotFound: {
    type: createV2ProblemType('tenant-management/customer-profile-not-found'),
    title: 'Customer profile not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested customer profile was not found.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toGetBranchDetailProblem(error: TenantManagementApplicationError): V2ProblemException {
  const definition = GetBranchDetailProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
