import { HttpStatus } from '@nestjs/common';

import {
  createProblemType,
  PlatformProblemTypes,
  ProblemDetailsExtensions,
  ProblemException,
} from 'src/core/problem-details';
import {
  ActiveOwnerContractNotFoundError,
  MultipleActiveOwnerContractsError,
} from '../../../asset-inventory/domain/errors/asset-inventory.errors';
import { OfferingSetupApplicationError, OfferingSetupApplicationErrorCode } from '../offering-setup-application.error';

interface OfferingSetupProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
  extensions?: (cause: unknown) => ProblemDetailsExtensions | undefined;
}

const OfferingSetupProblemCatalog: Record<OfferingSetupApplicationErrorCode, OfferingSetupProblemDefinition> = {
  TenantValidationFailed: {
    type: createProblemType('offering-setup/tenant-validation-failed'),
    title: 'Tenant validation failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The tenant or selected branches are not available for offering setup.',
  },
  AssetInventorySetupFailed: {
    type: createProblemType('offering-setup/asset-inventory-setup-failed'),
    title: 'Asset inventory setup failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The equipment type or assets could not be created.',
  },
  ActiveOwnerContractNotFound: {
    type: createProblemType('offering-setup/active-owner-contract-not-found'),
    title: 'Active owner contract not found',
    status: HttpStatus.CONFLICT,
    detail: 'One of the provided asset owners does not have an active contract.',
    extensions: activeOwnerContractNotFoundExtensions,
  },
  MultipleActiveOwnerContracts: {
    type: createProblemType('offering-setup/multiple-active-owner-contracts'),
    title: 'Multiple active owner contracts',
    status: HttpStatus.CONFLICT,
    detail: 'One of the provided asset owners has multiple active contracts.',
    extensions: multipleActiveOwnerContractsExtensions,
  },
  CatalogSetupFailed: {
    type: createProblemType('offering-setup/catalog-setup-failed'),
    title: 'Catalog setup failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rentable item could not be created.',
  },
  PricingSetupFailed: {
    type: createProblemType('offering-setup/pricing-setup-failed'),
    title: 'Pricing setup failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The pricing could not be configured.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toCreateRentableEquipmentProblem(error: OfferingSetupApplicationError): ProblemException {
  const definition = OfferingSetupProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
    extensions: definition.extensions?.(error.cause),
  });
}

function activeOwnerContractNotFoundExtensions(cause: unknown): ProblemDetailsExtensions | undefined {
  if (!(cause instanceof ActiveOwnerContractNotFoundError)) return undefined;
  return { ownerId: cause.ownerId };
}

function multipleActiveOwnerContractsExtensions(cause: unknown): ProblemDetailsExtensions | undefined {
  if (!(cause instanceof MultipleActiveOwnerContractsError)) return undefined;
  return { ownerId: cause.ownerId };
}
