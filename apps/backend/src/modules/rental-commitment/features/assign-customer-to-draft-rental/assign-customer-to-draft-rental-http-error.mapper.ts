import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

import {
  AssignCustomerToDraftRentalApplicationError,
  AssignCustomerToDraftRentalApplicationErrorCode,
} from './assign-customer-to-draft-rental-application.error';

interface ProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const ProblemCatalog: Record<AssignCustomerToDraftRentalApplicationErrorCode, ProblemDefinition> = {
  RentalNotFound: {
    type: createProblemType('rental-commitment/rental-not-found'),
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental could not be found.',
  },
  RentalMustBeDraft: {
    type: createProblemType('rental-commitment/rental-must-be-draft'),
    title: 'Rental must be draft',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rental must be a draft rental.',
  },
  CustomerNotFoundOrNotAssignable: {
    type: createProblemType('rental-commitment/customer-not-assignable-to-draft-rental'),
    title: 'Customer cannot be assigned to draft rental',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested customer could not be assigned to the draft rental.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toAssignCustomerToDraftRentalProblem(
  error: AssignCustomerToDraftRentalApplicationError,
): ProblemException {
  const definition = ProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
