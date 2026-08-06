import { Body, Controller, HttpCode, HttpStatus, Param, Put } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import { ReplaceEquipmentTypeAccessoryDefaultsCommand } from './replace-equipment-type-accessory-defaults.command';
import {
  ReplaceEquipmentTypeAccessoryDefaultsError,
  ReplaceEquipmentTypeAccessoryDefaultsErrorCode,
} from './replace-equipment-type-accessory-defaults.errors';
import { ReplaceEquipmentTypeAccessoryDefaultsResult } from './replace-equipment-type-accessory-defaults.handler';
import {
  ReplaceEquipmentTypeAccessoryDefaultsParamsDto,
  ReplaceEquipmentTypeAccessoryDefaultsRequestDto,
} from './replace-equipment-type-accessory-defaults.request.dto';

@Controller('asset-inventory/equipment-types/:equipmentTypeId/accessory-defaults')
export class ReplaceEquipmentTypeAccessoryDefaultsHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put()
  @HttpCode(HttpStatus.NO_CONTENT)
  async replace(
    @Param() params: ReplaceEquipmentTypeAccessoryDefaultsParamsDto,
    @Body() dto: ReplaceEquipmentTypeAccessoryDefaultsRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<
      ReplaceEquipmentTypeAccessoryDefaultsCommand,
      ReplaceEquipmentTypeAccessoryDefaultsResult
    >(
      new ReplaceEquipmentTypeAccessoryDefaultsCommand({
        tenantId: user.tenantId,
        equipmentTypeId: params.equipmentTypeId,
        accessories: dto.accessories,
      }),
    );

    if (result.isErr()) {
      throw toReplaceEquipmentTypeAccessoryDefaultsProblem(result.error);
    }
  }
}

function toReplaceEquipmentTypeAccessoryDefaultsProblem(
  error: ReplaceEquipmentTypeAccessoryDefaultsError,
): ProblemException {
  const problem = replaceEquipmentTypeAccessoryDefaultsProblemMap[error.code];
  const contextKeyByCode: Partial<Record<ReplaceEquipmentTypeAccessoryDefaultsErrorCode, string>> = {
    'asset_inventory.equipment_type_not_found': 'equipmentTypeId',
    'asset_inventory.equipment_type_not_active': 'equipmentTypeId',
    'asset_inventory.accessory_equipment_type_not_found': 'accessoryEquipmentTypeId',
    'asset_inventory.accessory_equipment_type_not_active': 'accessoryEquipmentTypeId',
    'asset_inventory.duplicate_accessory_default_in_request': 'accessoryEquipmentTypeId',
    'asset_inventory.accessory_default_self_reference_not_allowed': 'equipmentTypeId',
  };
  const contextKey = contextKeyByCode[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: {
        code: error.code,
        ...(contextKey ? { [contextKey]: error.context?.[contextKey] } : {}),
      },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const replaceEquipmentTypeAccessoryDefaultsProblemMap = {
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
  'asset_inventory.accessory_default_self_reference_not_allowed': {
    type: createProblemType('asset_inventory.accessory_default_self_reference_not_allowed'),
    title: 'Accessory default self-reference not allowed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'An equipment type cannot be configured as its own accessory default.',
  },
} satisfies Record<
  ReplaceEquipmentTypeAccessoryDefaultsErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
