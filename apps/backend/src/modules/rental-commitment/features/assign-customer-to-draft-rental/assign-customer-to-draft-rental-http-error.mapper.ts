import { HttpStatus } from '@nestjs/common';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import {
  AssignCustomerToDraftRentalApplicationError,
  AssignCustomerToDraftRentalApplicationErrorCode,
} from './assign-customer-to-draft-rental-application.error';

interface ProblemDefinition {
  type: string;
  title: string;
  status: HttpStatus;
  detail: string;
}

const problemCatalog: Record<AssignCustomerToDraftRentalApplicationErrorCode, ProblemDefinition> = {
  'rental-commitment.rental-not-found': {
    type: createProblemType('rental-commitment/rental-not-found'),
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental could not be found.',
  },
  'rental-commitment.rental-must-be-draft': {
    type: createProblemType('rental-commitment/rental-must-be-draft'),
    title: 'Rental must be draft',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rental must be a draft rental.',
  },
  'rental-commitment.customer-not-found-or-outside-tenant': {
    type: createProblemType('rental-commitment/customer-not-assignable-to-draft-rental'),
    title: 'Customer cannot be assigned to draft rental',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested customer is not available for this draft rental.',
  },
  'rental-commitment.customer-deleted': {
    type: createProblemType('rental-commitment/customer-deleted'),
    title: 'Customer is deleted',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested customer is no longer available.',
  },
  'rental-commitment.customer-inactive': {
    type: createProblemType('rental-commitment/customer-inactive'),
    title: 'Customer is inactive',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested customer is inactive.',
  },
  'rental-commitment.invalid-customer': {
    type: createProblemType('rental-commitment/invalid-customer'),
    title: 'Invalid customer',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested customer is invalid.',
  },
};

export function toAssignCustomerToDraftRentalProblem(
  error: AssignCustomerToDraftRentalApplicationError,
): ProblemException {
  const definition = problemCatalog[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: definition.type,
      title: definition.title,
      status: definition.status,
      detail: definition.detail,
    }),
    applicationError: error,
    cause: error.cause,
  });
}
