import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

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
    type: createProblemType('tenant-management/customer-not-found'),
    title: 'Customer not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The current rental customer could not be found.',
  },
  CustomerProfileAlreadyPending: {
    type: createProblemType('tenant-management/customer-profile-already-pending'),
    title: 'Customer profile already pending',
    status: HttpStatus.CONFLICT,
    detail: 'The customer profile has already been submitted and is pending review.',
  },
  CustomerProfileAlreadyApproved: {
    type: createProblemType('tenant-management/customer-profile-already-approved'),
    title: 'Customer profile already approved',
    status: HttpStatus.CONFLICT,
    detail: 'The customer profile has already been approved.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toSubmitCustomerProfileProblem(error: SubmitCustomerProfileApplicationError): ProblemException {
  const definition = SubmitCustomerProfileProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
