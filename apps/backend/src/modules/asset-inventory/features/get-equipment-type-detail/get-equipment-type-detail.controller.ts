import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import { GetEquipmentTypeDetailError, GetEquipmentTypeDetailErrorCode } from './get-equipment-type-detail.errors';
import { GetEquipmentTypeDetailResult } from './get-equipment-type-detail.handler';
import { GetEquipmentTypeDetailQuery } from './get-equipment-type-detail.query';
import { GetEquipmentTypeDetailParamsDto } from './get-equipment-type-detail.request.dto';
import type { GetEquipmentTypeDetailResponseDto } from './get-equipment-type-detail.response.dto';

@Controller('asset-inventory/equipment-types')
export class GetEquipmentTypeDetailHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':equipmentTypeId')
  async getEquipmentTypeDetail(
    @Param() params: GetEquipmentTypeDetailParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetEquipmentTypeDetailResponseDto> {
    const result = await this.queryBus.execute<GetEquipmentTypeDetailQuery, GetEquipmentTypeDetailResult>(
      new GetEquipmentTypeDetailQuery(user.tenantId, params.equipmentTypeId),
    );

    if (result.isErr()) {
      throw toGetEquipmentTypeDetailProblem(result.error);
    }

    return result.value;
  }
}

function toGetEquipmentTypeDetailProblem(error: GetEquipmentTypeDetailError): ProblemException {
  const problem = getEquipmentTypeDetailProblemMap[error.code];

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

const getEquipmentTypeDetailProblemMap = {
  'asset_inventory.equipment_type_not_found': {
    type: createProblemType('asset_inventory.equipment_type_not_found'),
    title: 'Equipment type not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested equipment type could not be found.',
  },
} satisfies Record<
  GetEquipmentTypeDetailErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
