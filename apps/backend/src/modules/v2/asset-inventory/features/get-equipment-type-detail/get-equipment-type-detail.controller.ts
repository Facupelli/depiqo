import { Controller, Get, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';
import { GetEquipmentTypeDetailResult } from './get-equipment-type-detail.handler';
import { toGetEquipmentTypeDetailProblem } from './get-equipment-type-detail-http-error.mapper';
import { GetEquipmentTypeDetailQuery } from './get-equipment-type-detail.query';
import { GetEquipmentTypeDetailParamsDto } from './get-equipment-type-detail.request.dto';
import type { GetEquipmentTypeDetailResponseDto } from './get-equipment-type-detail.response.dto';

@Controller('v2/asset-inventory/equipment-types')
export class GetEquipmentTypeDetailHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':equipmentTypeId')
  async getEquipmentTypeDetail(
    @Param() params: GetEquipmentTypeDetailParamsDto,
    @CurrentUser() user: AuthenticatedUser,
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
