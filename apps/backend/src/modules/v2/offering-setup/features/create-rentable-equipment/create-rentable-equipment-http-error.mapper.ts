import { HttpStatus } from '@nestjs/common';

import {
  createV2ProblemType,
  V2PlatformProblemTypes,
  V2ProblemDetailsExtensions,
  V2ProblemException,
} from 'src/core/problem-details/v2';
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
  extensions?: (cause: unknown) => V2ProblemDetailsExtensions | undefined;
}

const OfferingSetupProblemCatalog: Record<OfferingSetupApplicationErrorCode, OfferingSetupProblemDefinition> = {
  TenantValidationFailed: {
    type: createV2ProblemType('offering-setup/tenant-validation-failed'),
    title: 'Tenant validation failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The tenant or selected branches are not available for offering setup.',
  },
  AssetInventorySetupFailed: {
    type: createV2ProblemType('offering-setup/asset-inventory-setup-failed'),
    title: 'Asset inventory setup failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The equipment type or assets could not be created.',
  },
  ActiveOwnerContractNotFound: {
    type: createV2ProblemType('offering-setup/active-owner-contract-not-found'),
    title: 'Active owner contract not found',
    status: HttpStatus.CONFLICT,
    detail: 'One of the provided asset owners does not have an active contract.',
    extensions: activeOwnerContractNotFoundExtensions,
  },
  MultipleActiveOwnerContracts: {
    type: createV2ProblemType('offering-setup/multiple-active-owner-contracts'),
    title: 'Multiple active owner contracts',
    status: HttpStatus.CONFLICT,
    detail: 'One of the provided asset owners has multiple active contracts.',
    extensions: multipleActiveOwnerContractsExtensions,
  },
  CatalogSetupFailed: {
    type: createV2ProblemType('offering-setup/catalog-setup-failed'),
    title: 'Catalog setup failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rentable item could not be created.',
  },
  PricingSetupFailed: {
    type: createV2ProblemType('offering-setup/pricing-setup-failed'),
    title: 'Pricing setup failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The pricing could not be configured.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toCreateRentableEquipmentProblem(error: OfferingSetupApplicationError): V2ProblemException {
  const definition = OfferingSetupProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
    extensions: definition.extensions?.(error.cause),
  });
}

function activeOwnerContractNotFoundExtensions(cause: unknown): V2ProblemDetailsExtensions | undefined {
  if (!(cause instanceof ActiveOwnerContractNotFoundError)) return undefined;
  return { ownerId: cause.ownerId };
}

function multipleActiveOwnerContractsExtensions(cause: unknown): V2ProblemDetailsExtensions | undefined {
  if (!(cause instanceof MultipleActiveOwnerContractsError)) return undefined;
  return { ownerId: cause.ownerId };
}
