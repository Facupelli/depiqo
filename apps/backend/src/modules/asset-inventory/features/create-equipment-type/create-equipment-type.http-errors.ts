import { HttpStatus } from '@nestjs/common';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { CreateEquipmentTypeError, CreateEquipmentTypeErrorCode } from './create-equipment-type.errors';

export function toCreateEquipmentTypeProblem(error: CreateEquipmentTypeError): ProblemException {
  const problem = createEquipmentTypeProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: publicErrorExtensions(error),
    }),
    applicationError: error,
    cause: error.cause,
  });
}

function publicErrorExtensions(error: CreateEquipmentTypeError): Record<string, unknown> {
  const context = error.context ?? {};

  if (
    error.code === 'asset_inventory.invalid_equipment_type_field' ||
    error.code === 'asset_inventory.invalid_asset_field'
  ) {
    return {
      code: error.code,
      'invalid-params': [{ name: context.field, reason: context.reason }],
    };
  }

  const extensionByCode: Partial<Record<CreateEquipmentTypeErrorCode, string>> = {
    'asset_inventory.duplicate_equipment_type_name': 'name',
    'asset_inventory.duplicate_asset_serial_number': 'serialNumber',
    'asset_inventory.asset_owner_not_found': 'ownerId',
    'asset_inventory.active_owner_contract_not_found': 'ownerId',
    'asset_inventory.multiple_active_owner_contracts': 'ownerId',
  };
  const contextKey = extensionByCode[error.code];

  return contextKey ? { code: error.code, [contextKey]: context[contextKey] } : { code: error.code };
}

const createEquipmentTypeProblemMap = {
  'asset_inventory.tenant_validation_failed': {
    type: createProblemType('asset_inventory.tenant_validation_failed'),
    title: 'Tenant validation failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The tenant or selected branches are not available for asset creation.',
  },
  'asset_inventory.invalid_equipment_type_field': {
    type: createProblemType('asset_inventory.invalid_equipment_type_field'),
    title: 'Invalid equipment type field',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'One of the provided equipment type fields is invalid.',
  },
  'asset_inventory.duplicate_equipment_type_name': {
    type: createProblemType('asset_inventory.duplicate_equipment_type_name'),
    title: 'Duplicate equipment type name',
    status: HttpStatus.CONFLICT,
    detail: 'An equipment type with the provided name already exists for this tenant.',
  },
  'asset_inventory.invalid_asset_field': {
    type: createProblemType('asset_inventory.invalid_asset_field'),
    title: 'Invalid asset field',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'One of the provided asset fields is invalid.',
  },
  'asset_inventory.duplicate_asset_serial_number': {
    type: createProblemType('asset_inventory.duplicate_asset_serial_number'),
    title: 'Duplicate asset serial number',
    status: HttpStatus.CONFLICT,
    detail: 'An asset with the provided serial number already exists for this equipment type.',
  },
  'asset_inventory.asset_owner_not_found': {
    type: createProblemType('asset_inventory.asset_owner_not_found'),
    title: 'Asset owner not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'One of the provided asset owners could not be found.',
  },
  'asset_inventory.active_owner_contract_not_found': {
    type: createProblemType('asset_inventory.active_owner_contract_not_found'),
    title: 'Active owner contract not found',
    status: HttpStatus.CONFLICT,
    detail: 'One of the provided asset owners does not have an active contract.',
  },
  'asset_inventory.multiple_active_owner_contracts': {
    type: createProblemType('asset_inventory.multiple_active_owner_contracts'),
    title: 'Multiple active owner contracts',
    status: HttpStatus.CONFLICT,
    detail: 'One of the provided asset owners has multiple active contracts.',
  },
} satisfies Record<CreateEquipmentTypeErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
