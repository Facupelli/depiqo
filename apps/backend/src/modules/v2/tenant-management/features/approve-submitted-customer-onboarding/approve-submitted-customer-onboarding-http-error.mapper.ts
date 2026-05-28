import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

import {
  ApproveSubmittedCustomerOnboardingApplicationError,
  ApproveSubmittedCustomerOnboardingApplicationErrorCode,
} from './approve-submitted-customer-onboarding-application.error';

interface ApproveSubmittedCustomerOnboardingProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const ApproveSubmittedCustomerOnboardingProblemCatalog: Record<
  ApproveSubmittedCustomerOnboardingApplicationErrorCode,
  ApproveSubmittedCustomerOnboardingProblemDefinition
> = {
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
  CustomerOnboardingNotPending: {
    type: createV2ProblemType('tenant-management/customer-onboarding-not-pending'),
    title: 'Customer onboarding is not pending',
    status: HttpStatus.CONFLICT,
    detail: 'Only pending customer onboarding submissions can be reviewed.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toApproveSubmittedCustomerOnboardingProblem(
  error: ApproveSubmittedCustomerOnboardingApplicationError,
): V2ProblemException {
  const definition = ApproveSubmittedCustomerOnboardingProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
