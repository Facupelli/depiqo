import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

import {
  SubmitCustomerProfileApplicationError,
  SubmitCustomerProfileApplicationErrorCode,
} from './submit-customer-profile-application.error';

interface SubmitCustomerProfileProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const SubmitCustomerProfileProblemCatalog: Record<
  SubmitCustomerProfileApplicationErrorCode,
  SubmitCustomerProfileProblemDefinition
> = {
  CustomerNotFound: {
    type: createV2ProblemType('tenant-management/customer-not-found'),
    title: 'Customer not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The current rental customer could not be found.',
  },
  CustomerProfileAlreadyPending: {
    type: createV2ProblemType('tenant-management/customer-profile-already-pending'),
    title: 'Customer profile already pending',
    status: HttpStatus.CONFLICT,
    detail: 'The customer profile has already been submitted and is pending review.',
  },
  CustomerProfileAlreadyApproved: {
    type: createV2ProblemType('tenant-management/customer-profile-already-approved'),
    title: 'Customer profile already approved',
    status: HttpStatus.CONFLICT,
    detail: 'The customer profile has already been approved.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toSubmitCustomerProfileProblem(error: SubmitCustomerProfileApplicationError): V2ProblemException {
  const definition = SubmitCustomerProfileProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
