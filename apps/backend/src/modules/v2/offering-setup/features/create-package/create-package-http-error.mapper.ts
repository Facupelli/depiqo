import { HttpStatus } from '@nestjs/common';

import {
  createV2ProblemType,
  V2PlatformProblemTypes,
  V2ProblemDetailsExtensions,
  V2ProblemException,
} from 'src/core/problem-details/v2';
import { OfferingSetupApplicationError, OfferingSetupApplicationErrorCode } from '../offering-setup-application.error';

interface CreatePackageProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
  extensions?: (cause: unknown) => V2ProblemDetailsExtensions | undefined;
}

const CreatePackageProblemCatalog: Record<OfferingSetupApplicationErrorCode, CreatePackageProblemDefinition> = {
  TenantValidationFailed: {
    type: createV2ProblemType('offering-setup/package-tenant-validation-failed'),
    title: 'Tenant validation failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The tenant or selected branches are not available for package setup.',
  },
  AssetInventorySetupFailed: {
    type: createV2ProblemType('offering-setup/package-asset-inventory-validation-failed'),
    title: 'Asset inventory validation failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'One or more selected equipment types are not available for package setup.',
  },
  ActiveOwnerContractNotFound: {
    type: createV2ProblemType('offering-setup/package-active-owner-contract-not-found'),
    title: 'Active owner contract not found',
    status: HttpStatus.CONFLICT,
    detail: 'One of the provided asset owners does not have an active contract.',
  },
  MultipleActiveOwnerContracts: {
    type: createV2ProblemType('offering-setup/package-multiple-active-owner-contracts'),
    title: 'Multiple active owner contracts',
    status: HttpStatus.CONFLICT,
    detail: 'One of the provided asset owners has multiple active contracts.',
  },
  CatalogSetupFailed: {
    type: createV2ProblemType('offering-setup/package-catalog-setup-failed'),
    title: 'Catalog setup failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The package rentable item could not be created.',
  },
  PricingSetupFailed: {
    type: createV2ProblemType('offering-setup/package-pricing-setup-failed'),
    title: 'Pricing setup failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The package pricing could not be configured.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toCreatePackageProblem(error: OfferingSetupApplicationError): V2ProblemException {
  const definition = CreatePackageProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
    extensions: definition.extensions?.(error.cause),
  });
}
