import { HttpStatus } from '@nestjs/common';

import {
  createProblemType,
  PlatformProblemTypes,
  ProblemDetailsExtensions,
  ProblemException,
} from 'src/core/problem-details';

import {
  ActiveOwnerContractNotFoundError,
  AssetOwnerNotFoundError,
  DuplicateAssetSerialNumberError,
  DuplicateEquipmentTypeNameError,
  InvalidAssetFieldError,
  InvalidEquipmentTypeFieldError,
  MultipleActiveOwnerContractsError,
} from '../../domain/errors/asset-inventory.errors';
import {
  CreateEquipmentTypeApplicationError,
  CreateEquipmentTypeApplicationErrorCode,
} from './create-equipment-type-application.error';

interface CreateEquipmentTypeProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
  extensions?: (cause: unknown) => ProblemDetailsExtensions | undefined;
}

const CreateEquipmentTypeProblemCatalog: Record<
  CreateEquipmentTypeApplicationErrorCode,
  CreateEquipmentTypeProblemDefinition
> = {
  TenantValidationFailed: {
    type: createProblemType('asset-inventory/tenant-validation-failed'),
    title: 'Tenant validation failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The tenant or selected branches are not available for asset creation.',
  },
  InvalidEquipmentTypeField: {
    type: createProblemType('asset-inventory/invalid-equipment-type-field'),
    title: 'Invalid equipment type field',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'One of the provided equipment type fields is invalid.',
    extensions: invalidEquipmentTypeFieldExtensions,
  },
  DuplicateEquipmentTypeName: {
    type: createProblemType('asset-inventory/duplicate-equipment-type-name'),
    title: 'Duplicate equipment type name',
    status: HttpStatus.CONFLICT,
    detail: 'An equipment type with the provided name already exists for this tenant.',
    extensions: duplicateEquipmentTypeNameExtensions,
  },
  InvalidAssetField: {
    type: createProblemType('asset-inventory/invalid-asset-field'),
    title: 'Invalid asset field',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'One of the provided asset fields is invalid.',
    extensions: invalidAssetFieldExtensions,
  },
  DuplicateAssetSerialNumber: {
    type: createProblemType('asset-inventory/duplicate-asset-serial-number'),
    title: 'Duplicate asset serial number',
    status: HttpStatus.CONFLICT,
    detail: 'An asset with the provided serial number already exists for this equipment type.',
    extensions: duplicateAssetSerialNumberExtensions,
  },
  AssetOwnerNotFound: {
    type: createProblemType('asset-inventory/asset-owner-not-found'),
    title: 'Asset owner not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'One of the provided asset owners could not be found.',
    extensions: assetOwnerNotFoundExtensions,
  },
  ActiveOwnerContractNotFound: {
    type: createProblemType('asset-inventory/active-owner-contract-not-found'),
    title: 'Active owner contract not found',
    status: HttpStatus.CONFLICT,
    detail: 'One of the provided asset owners does not have an active contract.',
    extensions: activeOwnerContractNotFoundExtensions,
  },
  MultipleActiveOwnerContracts: {
    type: createProblemType('asset-inventory/multiple-active-owner-contracts'),
    title: 'Multiple active owner contracts',
    status: HttpStatus.CONFLICT,
    detail: 'One of the provided asset owners has multiple active contracts.',
    extensions: multipleActiveOwnerContractsExtensions,
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toCreateEquipmentTypeProblem(error: CreateEquipmentTypeApplicationError): ProblemException {
  const definition = CreateEquipmentTypeProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
    extensions: definition.extensions?.(error.cause),
  });
}

function invalidEquipmentTypeFieldExtensions(cause: unknown): ProblemDetailsExtensions | undefined {
  if (!(cause instanceof InvalidEquipmentTypeFieldError)) return undefined;
  return { 'invalid-params': [{ name: cause.field, reason: cause.reason }] };
}

function duplicateEquipmentTypeNameExtensions(cause: unknown): ProblemDetailsExtensions | undefined {
  if (!(cause instanceof DuplicateEquipmentTypeNameError)) return undefined;
  return { name: cause.name };
}

function invalidAssetFieldExtensions(cause: unknown): ProblemDetailsExtensions | undefined {
  if (!(cause instanceof InvalidAssetFieldError)) return undefined;
  return { 'invalid-params': [{ name: cause.field, reason: cause.reason }] };
}

function duplicateAssetSerialNumberExtensions(cause: unknown): ProblemDetailsExtensions | undefined {
  if (!(cause instanceof DuplicateAssetSerialNumberError)) return undefined;
  return { serialNumber: cause.serialNumber };
}

function assetOwnerNotFoundExtensions(cause: unknown): ProblemDetailsExtensions | undefined {
  if (!(cause instanceof AssetOwnerNotFoundError)) return undefined;
  return { ownerId: cause.ownerId };
}

function activeOwnerContractNotFoundExtensions(cause: unknown): ProblemDetailsExtensions | undefined {
  if (!(cause instanceof ActiveOwnerContractNotFoundError)) return undefined;
  return { ownerId: cause.ownerId };
}

function multipleActiveOwnerContractsExtensions(cause: unknown): ProblemDetailsExtensions | undefined {
  if (!(cause instanceof MultipleActiveOwnerContractsError)) return undefined;
  return { ownerId: cause.ownerId };
}
