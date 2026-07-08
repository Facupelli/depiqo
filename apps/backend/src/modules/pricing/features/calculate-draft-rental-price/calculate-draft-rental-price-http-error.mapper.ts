import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

import {
  CalculateDraftRentalPriceApplicationError,
  CalculateDraftRentalPriceApplicationErrorCode,
} from './calculate-draft-rental-price-application.error';

interface CalculateDraftRentalPriceProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const CalculateDraftRentalPriceProblemCatalog: Record<
  CalculateDraftRentalPriceApplicationErrorCode,
  CalculateDraftRentalPriceProblemDefinition
> = {
  InvalidDraftRentalPricingInput: {
    type: createProblemType('pricing/invalid-draft-rental-pricing-input'),
    title: 'Invalid draft rental pricing input',
    status: HttpStatus.BAD_REQUEST,
    detail: 'The draft rental pricing input is invalid.',
  },
  RentalPeriodInvalid: {
    type: createProblemType('pricing/invalid-rental-period'),
    title: 'Invalid rental period',
    status: HttpStatus.BAD_REQUEST,
    detail: 'The rental period is invalid.',
  },
  BranchNotFound: {
    type: createProblemType('pricing/branch-not-found'),
    title: 'Branch not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested branch was not found.',
  },
  TenantPricingConfigUnavailable: {
    type: createProblemType('pricing/tenant-pricing-config-unavailable'),
    title: 'Tenant pricing config unavailable',
    status: HttpStatus.NOT_FOUND,
    detail: 'The tenant pricing configuration is unavailable.',
  },
  RentalOfferNotFound: {
    type: createProblemType('pricing/rental-offer-not-found'),
    title: 'Rental offer not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'One or more requested rental offers were not found.',
  },
  MissingActivePricing: {
    type: createProblemType('pricing/missing-active-pricing'),
    title: 'Missing active pricing',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'One or more requested rental offers do not have active pricing.',
  },
  PricingCalculationFailed: {
    type: createProblemType('pricing/draft-rental-calculation-failed'),
    title: 'Draft rental pricing calculation failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The draft rental price could not be calculated with the current pricing configuration.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toCalculateDraftRentalPriceProblem(error: CalculateDraftRentalPriceApplicationError): ProblemException {
  const definition = CalculateDraftRentalPriceProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
