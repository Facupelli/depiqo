import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

import {
  ActivateRentableItemApplicationError,
  ActivateRentableItemApplicationErrorCode,
} from './activate-rentable-item-application.error';

interface ActivateRentableItemProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const ActivateRentableItemProblemCatalog: Record<
  ActivateRentableItemApplicationErrorCode,
  ActivateRentableItemProblemDefinition
> = {
  RentableItemNotFound: {
    type: createProblemType('catalog/rentable-item-not-found'),
    title: 'Rentable item not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rentable item could not be found.',
  },
  RentableItemNotInDraftStatus: {
    type: createProblemType('catalog/rentable-item-not-in-draft-status'),
    title: 'Rentable item is not in draft status',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'Only draft rentable items can be activated.',
  },
  RentableItemHasNoRequirements: {
    type: createProblemType('catalog/rentable-item-has-no-requirements'),
    title: 'Rentable item has no requirements',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rentable item must have at least one equipment requirement before it can be activated.',
  },
  RentableItemHasNoRentalOffers: {
    type: createProblemType('catalog/rentable-item-has-no-rental-offers'),
    title: 'Rentable item has no rental offers',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rentable item must have at least one branch rental offer before it can be activated.',
  },
  RentableItemHasNoActivePricing: {
    type: createProblemType('catalog/rentable-item-has-no-active-pricing'),
    title: 'Rentable item has no active pricing',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'At least one rental offer must have active pricing before the rentable item can be activated.',
  },
  RentableItemHasInsufficientActiveAssets: {
    type: createProblemType('catalog/rentable-item-has-insufficient-active-assets'),
    title: 'Rentable item has insufficient active assets',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'No priced branch offer has enough active assets to fulfill the rentable item requirements.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toActivateRentableItemProblem(error: ActivateRentableItemApplicationError): ProblemException {
  const definition = ActivateRentableItemProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
    extensions: error.context ? { ...error.context } : undefined,
  });
}
