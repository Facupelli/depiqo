import { HttpStatus } from '@nestjs/common';

import {
  createV2ProblemType,
  V2PlatformProblemTypes,
  V2ProblemDetailsExtensions,
  V2ProblemException,
} from 'src/core/problem-details/v2';

import { EquipmentTypeNotActiveError, EquipmentTypeNotFoundError } from '../../domain/errors/asset-inventory.errors';
import {
  CreateEquipmentTypeAccessoryDefaultsApplicationError,
  CreateEquipmentTypeAccessoryDefaultsApplicationErrorCode,
} from './create-equipment-type-accessory-defaults-application.error';
import {
  AccessoryDefaultAlreadyExistsError,
  DuplicateAccessoryInRequestError,
  SelfReferenceAccessoryDefaultError,
} from './map-create-equipment-type-accessory-defaults-error';

interface CreateEquipmentTypeAccessoryDefaultsProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
  extensions?: (cause: unknown) => V2ProblemDetailsExtensions | undefined;
}

const CreateEquipmentTypeAccessoryDefaultsProblemCatalog: Record<
  CreateEquipmentTypeAccessoryDefaultsApplicationErrorCode,
  CreateEquipmentTypeAccessoryDefaultsProblemDefinition
> = {
  EquipmentTypeNotFound: {
    type: createV2ProblemType('asset-inventory/equipment-type-not-found'),
    title: 'Equipment type not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested equipment type could not be found.',
    extensions: equipmentTypeNotFoundExtensions,
  },
  EquipmentTypeNotActive: {
    type: createV2ProblemType('asset-inventory/equipment-type-not-active'),
    title: 'Equipment type not active',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested equipment type is not active.',
    extensions: equipmentTypeNotActiveExtensions,
  },
  AccessoryEquipmentTypeNotFound: {
    type: createV2ProblemType('asset-inventory/accessory-equipment-type-not-found'),
    title: 'Accessory equipment type not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'One of the requested accessory equipment types could not be found.',
    extensions: accessoryEquipmentTypeNotFoundExtensions,
  },
  AccessoryEquipmentTypeNotActive: {
    type: createV2ProblemType('asset-inventory/accessory-equipment-type-not-active'),
    title: 'Accessory equipment type not active',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'One of the requested accessory equipment types is not active.',
    extensions: accessoryEquipmentTypeNotActiveExtensions,
  },
  DuplicateAccessoryInRequest: {
    type: createV2ProblemType('asset-inventory/duplicate-accessory-default-in-request'),
    title: 'Duplicate accessory default in request',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The request contains the same accessory equipment type more than once.',
    extensions: duplicateAccessoryInRequestExtensions,
  },
  AccessoryDefaultAlreadyExists: {
    type: createV2ProblemType('asset-inventory/accessory-default-already-exists'),
    title: 'Accessory default already exists',
    status: HttpStatus.CONFLICT,
    detail: 'An accessory default already exists for one of the requested accessory equipment types.',
    extensions: accessoryDefaultAlreadyExistsExtensions,
  },
  SelfReferenceNotAllowed: {
    type: createV2ProblemType('asset-inventory/accessory-default-self-reference-not-allowed'),
    title: 'Accessory default self-reference not allowed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'An equipment type cannot be configured as its own accessory default.',
    extensions: selfReferenceNotAllowedExtensions,
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toCreateEquipmentTypeAccessoryDefaultsProblem(
  error: CreateEquipmentTypeAccessoryDefaultsApplicationError,
): V2ProblemException {
  const definition = CreateEquipmentTypeAccessoryDefaultsProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
    extensions: definition.extensions?.(error.cause),
  });
}

function equipmentTypeNotFoundExtensions(cause: unknown): V2ProblemDetailsExtensions | undefined {
  if (!(cause instanceof EquipmentTypeNotFoundError)) return undefined;
  return { equipmentTypeId: cause.equipmentTypeId };
}

function equipmentTypeNotActiveExtensions(cause: unknown): V2ProblemDetailsExtensions | undefined {
  if (!(cause instanceof EquipmentTypeNotActiveError)) return undefined;
  return { equipmentTypeId: cause.equipmentTypeId };
}

function accessoryEquipmentTypeNotFoundExtensions(cause: unknown): V2ProblemDetailsExtensions | undefined {
  if (!(cause instanceof EquipmentTypeNotFoundError)) return undefined;
  return { accessoryEquipmentTypeId: cause.equipmentTypeId };
}

function accessoryEquipmentTypeNotActiveExtensions(cause: unknown): V2ProblemDetailsExtensions | undefined {
  if (!(cause instanceof EquipmentTypeNotActiveError)) return undefined;
  return { accessoryEquipmentTypeId: cause.equipmentTypeId };
}

function duplicateAccessoryInRequestExtensions(cause: unknown): V2ProblemDetailsExtensions | undefined {
  if (!(cause instanceof DuplicateAccessoryInRequestError)) return undefined;
  return { accessoryEquipmentTypeId: cause.accessoryEquipmentTypeId };
}

function accessoryDefaultAlreadyExistsExtensions(cause: unknown): V2ProblemDetailsExtensions | undefined {
  if (!(cause instanceof AccessoryDefaultAlreadyExistsError)) return undefined;
  return {
    equipmentTypeId: cause.equipmentTypeId,
    accessoryEquipmentTypeId: cause.accessoryEquipmentTypeId,
  };
}

function selfReferenceNotAllowedExtensions(cause: unknown): V2ProblemDetailsExtensions | undefined {
  if (!(cause instanceof SelfReferenceAccessoryDefaultError)) return undefined;
  return { equipmentTypeId: cause.equipmentTypeId };
}
