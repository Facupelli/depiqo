import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

import { CancelRentalApplicationError, CancelRentalApplicationErrorCode } from './cancel-rental-application.error';

interface ProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const ProblemCatalog: Record<CancelRentalApplicationErrorCode, ProblemDefinition> = {
  RentalNotFound: {
    type: createV2ProblemType('rental-commitment/rental-not-found'),
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental could not be found.',
  },
  RentalAlreadyCancelled: {
    type: createV2ProblemType('rental-commitment/rental-already-cancelled'),
    title: 'Rental already cancelled',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rental is already cancelled.',
  },
  RentalCannotBeCancelledFromStatus: {
    type: createV2ProblemType('rental-commitment/rental-cannot-be-cancelled-from-status'),
    title: 'Rental cannot be cancelled from status',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rental cannot be cancelled from its current status.',
  },
  RentalCommitmentUnexpected: {
    type: createV2ProblemType('rental-commitment/unexpected-error'),
    title: 'Unexpected rental commitment error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected rental commitment error occurred.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toCancelRentalProblem(error: CancelRentalApplicationError): V2ProblemException {
  const definition = ProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
