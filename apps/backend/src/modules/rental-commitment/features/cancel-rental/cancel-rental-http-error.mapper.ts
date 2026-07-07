import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

import { CancelRentalApplicationError, CancelRentalApplicationErrorCode } from './cancel-rental-application.error';

interface ProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const ProblemCatalog: Record<CancelRentalApplicationErrorCode, ProblemDefinition> = {
  RentalNotFound: {
    type: createProblemType('rental-commitment/rental-not-found'),
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental could not be found.',
  },
  RentalAlreadyCancelled: {
    type: createProblemType('rental-commitment/rental-already-cancelled'),
    title: 'Rental already cancelled',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rental is already cancelled.',
  },
  RentalCannotBeCancelledFromStatus: {
    type: createProblemType('rental-commitment/rental-cannot-be-cancelled-from-status'),
    title: 'Rental cannot be cancelled from status',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rental cannot be cancelled from its current status.',
  },
  RentalCommitmentUnexpected: {
    type: createProblemType('rental-commitment/unexpected-error'),
    title: 'Unexpected rental commitment error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected rental commitment error occurred.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toCancelRentalProblem(error: CancelRentalApplicationError): ProblemException {
  const definition = ProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
