import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';
import { OfferingSetupApplicationError, OfferingSetupApplicationErrorCode } from '../offering-setup-application.error';

interface CreateRentalOfferWithPricingProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const CreateRentalOfferWithPricingProblemCatalog: Record<
  OfferingSetupApplicationErrorCode,
  CreateRentalOfferWithPricingProblemDefinition
> = {
  TenantValidationFailed: {
    type: createV2ProblemType('offering-setup/rental-offer-tenant-validation-failed'),
    title: 'Tenant validation failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The tenant or selected branch is not available for rental offer setup.',
  },
  AssetInventorySetupFailed: {
    type: createV2ProblemType('offering-setup/rental-offer-asset-inventory-validation-failed'),
    title: 'Asset inventory validation failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The selected asset inventory records are not available for rental offer setup.',
  },
  ActiveOwnerContractNotFound: {
    type: createV2ProblemType('offering-setup/rental-offer-active-owner-contract-not-found'),
    title: 'Active owner contract not found',
    status: HttpStatus.CONFLICT,
    detail: 'One of the provided asset owners does not have an active contract.',
  },
  MultipleActiveOwnerContracts: {
    type: createV2ProblemType('offering-setup/rental-offer-multiple-active-owner-contracts'),
    title: 'Multiple active owner contracts',
    status: HttpStatus.CONFLICT,
    detail: 'One of the provided asset owners has multiple active contracts.',
  },
  CatalogSetupFailed: {
    type: createV2ProblemType('offering-setup/rental-offer-catalog-setup-failed'),
    title: 'Catalog setup failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rental offer could not be created.',
  },
  PricingSetupFailed: {
    type: createV2ProblemType('offering-setup/rental-offer-pricing-setup-failed'),
    title: 'Pricing setup failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rental offer pricing could not be configured.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toCreateRentalOfferWithPricingProblem(error: OfferingSetupApplicationError): V2ProblemException {
  const definition = CreateRentalOfferWithPricingProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
