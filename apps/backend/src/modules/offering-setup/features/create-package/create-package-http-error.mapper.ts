import { HttpStatus } from '@nestjs/common';

import {
  createProblemType,
  PlatformProblemTypes,
  ProblemDetailsExtensions,
  ProblemException,
} from 'src/core/problem-details';
import { OfferingSetupApplicationError, OfferingSetupApplicationErrorCode } from '../offering-setup-application.error';

interface CreatePackageProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
  extensions?: (cause: unknown) => ProblemDetailsExtensions | undefined;
}

const CreatePackageProblemCatalog: Record<OfferingSetupApplicationErrorCode, CreatePackageProblemDefinition> = {
  TenantValidationFailed: {
    type: createProblemType('offering-setup/package-tenant-validation-failed'),
    title: 'Tenant validation failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The tenant or selected branches are not available for package setup.',
  },
  AssetInventorySetupFailed: {
    type: createProblemType('offering-setup/package-asset-inventory-validation-failed'),
    title: 'Asset inventory validation failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'One or more selected equipment types are not available for package setup.',
  },
  ActiveOwnerContractNotFound: {
    type: createProblemType('offering-setup/package-active-owner-contract-not-found'),
    title: 'Active owner contract not found',
    status: HttpStatus.CONFLICT,
    detail: 'One of the provided asset owners does not have an active contract.',
  },
  MultipleActiveOwnerContracts: {
    type: createProblemType('offering-setup/package-multiple-active-owner-contracts'),
    title: 'Multiple active owner contracts',
    status: HttpStatus.CONFLICT,
    detail: 'One of the provided asset owners has multiple active contracts.',
  },
  CatalogSetupFailed: {
    type: createProblemType('offering-setup/package-catalog-setup-failed'),
    title: 'Catalog setup failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The package rentable item could not be created.',
  },
  PricingSetupFailed: {
    type: createProblemType('offering-setup/package-pricing-setup-failed'),
    title: 'Pricing setup failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The package pricing could not be configured.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toCreatePackageProblem(error: OfferingSetupApplicationError): ProblemException {
  const definition = CreatePackageProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
    extensions: definition.extensions?.(error.cause),
  });
}
