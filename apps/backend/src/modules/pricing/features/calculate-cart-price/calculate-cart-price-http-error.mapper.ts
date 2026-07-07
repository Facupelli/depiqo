import { HttpStatus } from '@nestjs/common';

import { createProblemType, PlatformProblemTypes, ProblemException } from 'src/core/problem-details';

import {
  CalculateCartPriceApplicationError,
  CalculateCartPriceApplicationErrorCode,
} from './calculate-cart-price-application.error';

interface CalculateCartPriceProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const CalculateCartPriceProblemCatalog: Record<
  CalculateCartPriceApplicationErrorCode,
  CalculateCartPriceProblemDefinition
> = {
  InvalidCartSelection: {
    type: createProblemType('pricing/invalid-cart-selection'),
    title: 'Invalid cart selection',
    status: HttpStatus.BAD_REQUEST,
    detail: 'The cart selection is invalid.',
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
  RentalOfferNotSelectable: {
    type: createProblemType('pricing/rental-offer-not-selectable'),
    title: 'Rental offer not selectable',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'One or more requested rental offers are not selectable.',
  },
  RentableItemInactive: {
    type: createProblemType('pricing/rentable-item-inactive'),
    title: 'Rentable item inactive',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'One or more requested rentable items are not active.',
  },
  MissingActivePricing: {
    type: createProblemType('pricing/missing-active-pricing'),
    title: 'Missing active pricing',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'One or more requested rental offers do not have active pricing.',
  },
  CouponRequiresCustomer: {
    type: createProblemType('pricing/coupon-requires-customer'),
    title: 'Coupon requires customer',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'Coupon pricing requires a customer.',
  },
  CouponNotApplicable: {
    type: createProblemType('pricing/coupon-not-applicable'),
    title: 'Coupon not applicable',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested coupon could not be applied to this cart.',
  },
  PricingCalculationFailed: {
    type: createProblemType('pricing/calculation-failed'),
    title: 'Pricing calculation failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The cart price could not be calculated with the current pricing configuration.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toCalculateCartPriceProblem(error: CalculateCartPriceApplicationError): ProblemException {
  const definition = CalculateCartPriceProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
