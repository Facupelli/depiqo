import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import { AddAssetsToEquipmentTypeCommand } from './add-assets-to-equipment-type.command';
import {
  AddAssetsToEquipmentTypeError,
  AddAssetsToEquipmentTypeErrorCode,
} from './add-assets-to-equipment-type.errors';
import { AddAssetsToEquipmentTypeServiceResult } from './add-assets-to-equipment-type.handler';
import {
  AddAssetsToEquipmentTypeParamsDto,
  AddAssetsToEquipmentTypeRequestDto,
} from './add-assets-to-equipment-type.request.dto';
import { AddAssetsToEquipmentTypeResponseDto } from './add-assets-to-equipment-type.response.dto';

@Controller('asset-inventory/equipment-types/:equipmentTypeId/assets')
export class AddAssetsToEquipmentTypeHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param() params: AddAssetsToEquipmentTypeParamsDto,
    @Body() dto: AddAssetsToEquipmentTypeRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AddAssetsToEquipmentTypeResponseDto> {
    const result = await this.commandBus.execute<
      AddAssetsToEquipmentTypeCommand,
      AddAssetsToEquipmentTypeServiceResult
    >(
      new AddAssetsToEquipmentTypeCommand({
        tenantId: user.tenantId,
        equipmentTypeId: params.equipmentTypeId,
        assets: dto.assets,
      }),
    );

    if (result.isErr()) {
      throw toAddAssetsToEquipmentTypeProblem(result.error);
    }

    return { assetIds: result.value.assetIds };
  }
}

function toAddAssetsToEquipmentTypeProblem(error: AddAssetsToEquipmentTypeError): ProblemException {
  const problem = addAssetsToEquipmentTypeProblemMap[error.code];

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

function publicErrorExtensions(error: AddAssetsToEquipmentTypeError): Record<string, unknown> {
  const context = error.context ?? {};

  if (error.code === 'asset_inventory.invalid_asset_field') {
    return {
      code: error.code,
      'invalid-params': [{ name: context.field, reason: context.reason }],
    };
  }

  const extensionByCode: Partial<Record<AddAssetsToEquipmentTypeErrorCode, string>> = {
    'asset_inventory.equipment_type_not_found': 'equipmentTypeId',
    'asset_inventory.equipment_type_not_active': 'equipmentTypeId',
    'asset_inventory.asset_owner_not_found': 'ownerId',
    'asset_inventory.active_owner_contract_not_found': 'ownerId',
    'asset_inventory.multiple_active_owner_contracts': 'ownerId',
  };
  const contextKey = extensionByCode[error.code];

  return contextKey ? { code: error.code, [contextKey]: context[contextKey] } : { code: error.code };
}

const addAssetsToEquipmentTypeProblemMap = {
  'asset_inventory.tenant_validation_failed': {
    type: createProblemType('asset_inventory.tenant_validation_failed'),
    title: 'Tenant validation failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The tenant or selected branches are not available for asset creation.',
  },
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
  'asset_inventory.invalid_asset_field': {
    type: createProblemType('asset_inventory.invalid_asset_field'),
    title: 'Invalid asset field',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'One of the provided asset fields is invalid.',
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
} satisfies Record<
  AddAssetsToEquipmentTypeErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
