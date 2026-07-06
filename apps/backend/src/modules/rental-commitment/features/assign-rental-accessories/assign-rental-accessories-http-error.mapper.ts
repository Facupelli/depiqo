import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

import {
  AssignRentalAccessoriesApplicationError,
  AssignRentalAccessoriesApplicationErrorCode,
} from './assign-rental-accessories-application.error';

interface ProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const ProblemCatalog: Record<AssignRentalAccessoriesApplicationErrorCode, ProblemDefinition> = {
  RentalNotFound: {
    type: createV2ProblemType('rental-commitment/rental-not-found'),
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental could not be found.',
  },
  RentalStatusDoesNotAllowAccessoryAssignment: {
    type: createV2ProblemType('rental-commitment/rental-status-does-not-allow-accessory-assignment'),
    title: 'Rental status does not allow accessory assignment',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'Accessories can only be assigned while the rental is pending or confirmed.',
  },
  InvalidAccessoryQuantity: {
    type: createV2ProblemType('rental-commitment/invalid-accessory-quantity'),
    title: 'Invalid accessory quantity',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'Accessory quantities must be positive integers.',
  },
  DuplicateAccessorySelection: {
    type: createV2ProblemType('rental-commitment/duplicate-accessory-selection'),
    title: 'Duplicate accessory selection',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'Each source demand line and equipment type pair can only be requested once.',
  },
  InsufficientAssetAvailability: {
    type: createV2ProblemType('rental-commitment/insufficient-asset-availability'),
    title: 'Insufficient asset availability',
    status: HttpStatus.CONFLICT,
    detail: 'Not enough accessory assets are available for the rental period.',
  },
  DuplicateAccessoryAsset: {
    type: createV2ProblemType('rental-commitment/duplicate-accessory-asset'),
    title: 'Duplicate accessory asset',
    status: HttpStatus.CONFLICT,
    detail: 'The same physical asset cannot be assigned more than once.',
  },
  SourceRentalDemandLineNotFound: {
    type: createV2ProblemType('rental-commitment/source-rental-demand-line-not-found'),
    title: 'Source rental demand line not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'One of the source rental demand lines does not belong to this rental.',
  },
  AccessoryAssetNotFound: {
    type: createV2ProblemType('rental-commitment/accessory-asset-not-found'),
    title: 'Accessory asset not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'One of the selected accessory assets could not be found.',
  },
  AccessoryAssetNotAssignable: {
    type: createV2ProblemType('rental-commitment/accessory-asset-not-assignable'),
    title: 'Accessory asset not assignable',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'One of the selected accessory assets is not assignable for this rental.',
  },
  AccessoryAssetUnavailable: {
    type: createV2ProblemType('rental-commitment/accessory-asset-unavailable'),
    title: 'Accessory asset unavailable',
    status: HttpStatus.CONFLICT,
    detail: 'One of the selected accessory assets is already blocked for the rental period.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toAssignRentalAccessoriesProblem(error: AssignRentalAccessoriesApplicationError): V2ProblemException {
  const definition = ProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
