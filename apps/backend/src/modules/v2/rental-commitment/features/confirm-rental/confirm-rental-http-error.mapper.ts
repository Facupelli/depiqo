import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

import { ConfirmRentalApplicationError, ConfirmRentalApplicationErrorCode } from './confirm-rental-application.error';

interface ProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const ProblemCatalog: Record<ConfirmRentalApplicationErrorCode, ProblemDefinition> = {
  RentalNotFound: {
    type: createV2ProblemType('rental-commitment/rental-not-found'),
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental could not be found.',
  },
  RentalCannotBeConfirmedFromStatus: {
    type: createV2ProblemType('rental-commitment/rental-cannot-be-confirmed-from-status'),
    title: 'Rental cannot be confirmed from status',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rental cannot be confirmed from its current status.',
  },
  RentalConfirmationRequiresCustomer: {
    type: createV2ProblemType('rental-commitment/rental-confirmation-requires-customer'),
    title: 'Rental confirmation requires customer',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rental must have a linked customer before confirmation.',
  },
  ConfirmedRentalRequiresPriceSnapshot: {
    type: createV2ProblemType('rental-commitment/confirmed-rental-requires-price-snapshot'),
    title: 'Confirmed rental requires price snapshot',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rental cannot be confirmed without an existing price snapshot.',
  },
  InsufficientAssetAvailability: {
    type: createV2ProblemType('rental-commitment/insufficient-asset-availability'),
    title: 'Insufficient asset availability',
    status: HttpStatus.CONFLICT,
    detail: 'Not enough equipment is available for the requested rental period.',
  },
  DuplicateAssignedAsset: {
    type: createV2ProblemType('rental-commitment/duplicate-assigned-asset'),
    title: 'Duplicate assigned asset',
    status: HttpStatus.CONFLICT,
    detail: 'The same physical asset cannot be assigned more than once.',
  },
  InvalidRentalField: {
    type: createV2ProblemType('rental-commitment/invalid-rental-field'),
    title: 'Invalid rental field',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rental contains an invalid field value.',
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

export function toConfirmRentalProblem(error: ConfirmRentalApplicationError): V2ProblemException {
  const definition = ProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
