import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import { CreateEquipmentTypeAccessoryDefaultsCommand } from './create-equipment-type-accessory-defaults.command';
import {
  CreateEquipmentTypeAccessoryDefaultsError,
  CreateEquipmentTypeAccessoryDefaultsErrorCode,
} from './create-equipment-type-accessory-defaults.errors';
import { CreateEquipmentTypeAccessoryDefaultsServiceResult } from './create-equipment-type-accessory-defaults.handler';
import {
  CreateEquipmentTypeAccessoryDefaultsParamsDto,
  CreateEquipmentTypeAccessoryDefaultsRequestDto,
} from './create-equipment-type-accessory-defaults.request.dto';

@Controller('asset-inventory/equipment-types/:equipmentTypeId/accessory-defaults')
export class CreateEquipmentTypeAccessoryDefaultsHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param() params: CreateEquipmentTypeAccessoryDefaultsParamsDto,
    @Body() dto: CreateEquipmentTypeAccessoryDefaultsRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<
      CreateEquipmentTypeAccessoryDefaultsCommand,
      CreateEquipmentTypeAccessoryDefaultsServiceResult
    >(
      new CreateEquipmentTypeAccessoryDefaultsCommand({
        tenantId: user.tenantId,
        equipmentTypeId: params.equipmentTypeId,
        accessories: dto.accessories,
      }),
    );

    if (result.isErr()) {
      throw toCreateEquipmentTypeAccessoryDefaultsProblem(result.error);
    }
  }
}

function toCreateEquipmentTypeAccessoryDefaultsProblem(
  error: CreateEquipmentTypeAccessoryDefaultsError,
): ProblemException {
  const problem = createEquipmentTypeAccessoryDefaultsProblemMap[error.code];

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

function publicErrorExtensions(error: CreateEquipmentTypeAccessoryDefaultsError): Record<string, unknown> {
  const context = error.context ?? {};

  if (error.code === 'asset_inventory.accessory_default_already_exists') {
    return {
      code: error.code,
      equipmentTypeId: context.equipmentTypeId,
      ...(context.accessoryEquipmentTypeId === undefined
        ? {}
        : { accessoryEquipmentTypeId: context.accessoryEquipmentTypeId }),
    };
  }

  const extensionByCode: Partial<Record<CreateEquipmentTypeAccessoryDefaultsErrorCode, string>> = {
    'asset_inventory.equipment_type_not_found': 'equipmentTypeId',
    'asset_inventory.equipment_type_not_active': 'equipmentTypeId',
    'asset_inventory.accessory_equipment_type_not_found': 'accessoryEquipmentTypeId',
    'asset_inventory.accessory_equipment_type_not_active': 'accessoryEquipmentTypeId',
    'asset_inventory.duplicate_accessory_default_in_request': 'accessoryEquipmentTypeId',
    'asset_inventory.accessory_default_self_reference_not_allowed': 'equipmentTypeId',
  };
  const contextKey = extensionByCode[error.code];

  return contextKey ? { code: error.code, [contextKey]: context[contextKey] } : { code: error.code };
}

const createEquipmentTypeAccessoryDefaultsProblemMap = {
  'asset_inventory.equipment_type_not_found': {
    type: createProblemType('asset_inventory.equipment_type_not_found'),
    title: 'Equipment type not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested equipment type could not be found.',
  },
  'asset_inventory.equipment_type_not_active': {
    type: createProblemType('asset_inventory.equipment_type_not_active'),
    title: 'Equipment type not active',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested equipment type is not active.',
  },
  'asset_inventory.accessory_equipment_type_not_found': {
    type: createProblemType('asset_inventory.accessory_equipment_type_not_found'),
    title: 'Accessory equipment type not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'One of the requested accessory equipment types could not be found.',
  },
  'asset_inventory.accessory_equipment_type_not_active': {
    type: createProblemType('asset_inventory.accessory_equipment_type_not_active'),
    title: 'Accessory equipment type not active',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'One of the requested accessory equipment types is not active.',
  },
  'asset_inventory.duplicate_accessory_default_in_request': {
    type: createProblemType('asset_inventory.duplicate_accessory_default_in_request'),
    title: 'Duplicate accessory default in request',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The request contains the same accessory equipment type more than once.',
  },
  'asset_inventory.accessory_default_already_exists': {
    type: createProblemType('asset_inventory.accessory_default_already_exists'),
    title: 'Accessory default already exists',
    status: HttpStatus.CONFLICT,
    detail: 'An accessory default already exists for one of the requested accessory equipment types.',
  },
  'asset_inventory.accessory_default_self_reference_not_allowed': {
    type: createProblemType('asset_inventory.accessory_default_self_reference_not_allowed'),
    title: 'Accessory default self-reference not allowed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'An equipment type cannot be configured as its own accessory default.',
  },
} satisfies Record<
  CreateEquipmentTypeAccessoryDefaultsErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
