import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import {
  GetEquipmentTypeAccessoryDefaultsError,
  GetEquipmentTypeAccessoryDefaultsErrorCode,
} from './get-equipment-type-accessory-defaults.errors';
import { GetEquipmentTypeAccessoryDefaultsResult } from './get-equipment-type-accessory-defaults.handler';
import { GetEquipmentTypeAccessoryDefaultsQuery } from './get-equipment-type-accessory-defaults.query';
import { GetEquipmentTypeAccessoryDefaultsParamsDto } from './get-equipment-type-accessory-defaults.request.dto';
import type { GetEquipmentTypeAccessoryDefaultsResponseDto } from './get-equipment-type-accessory-defaults.response.dto';

@Controller('asset-inventory/equipment-types')
export class GetEquipmentTypeAccessoryDefaultsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':equipmentTypeId/accessory-defaults')
  async getEquipmentTypeAccessoryDefaults(
    @Param() params: GetEquipmentTypeAccessoryDefaultsParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetEquipmentTypeAccessoryDefaultsResponseDto> {
    const result = await this.queryBus.execute<
      GetEquipmentTypeAccessoryDefaultsQuery,
      GetEquipmentTypeAccessoryDefaultsResult
    >(new GetEquipmentTypeAccessoryDefaultsQuery(user.tenantId, params.equipmentTypeId));

    if (result.isErr()) {
      throw toGetEquipmentTypeAccessoryDefaultsProblem(result.error);
    }

    return result.value.map((accessoryDefault) => ({
      accessoryEquipmentTypeId: accessoryDefault.accessoryEquipmentTypeId,
      name: accessoryDefault.name,
      imageUrl: accessoryDefault.imageUrl,
      categoryId: accessoryDefault.categoryId,
      categoryName: accessoryDefault.categoryName,
      defaultQuantity: accessoryDefault.defaultQuantity,
    }));
  }
}

function toGetEquipmentTypeAccessoryDefaultsProblem(error: GetEquipmentTypeAccessoryDefaultsError): ProblemException {
  const problem = getEquipmentTypeAccessoryDefaultsProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: {
        code: error.code,
        equipmentTypeId: error.context?.equipmentTypeId,
      },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const getEquipmentTypeAccessoryDefaultsProblemMap = {
  'asset_inventory.equipment_type_not_found': {
    type: createProblemType('asset_inventory.equipment_type_not_found'),
    title: 'Equipment type not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested equipment type could not be found.',
  },
} satisfies Record<
  GetEquipmentTypeAccessoryDefaultsErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
