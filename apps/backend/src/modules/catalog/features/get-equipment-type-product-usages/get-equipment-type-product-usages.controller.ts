import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import type { GetEquipmentTypeProductUsagesResult } from './get-equipment-type-product-usages.handler';
import { GetEquipmentTypeProductUsagesQuery } from './get-equipment-type-product-usages.query';
import { GetEquipmentTypeProductUsagesRequestDto } from './get-equipment-type-product-usages.request.dto';
import type { GetEquipmentTypeProductUsagesResponseDto } from './get-equipment-type-product-usages.response.dto';

@Controller('catalog/equipment-type-product-usages')
export class GetEquipmentTypeProductUsagesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getEquipmentTypeProductUsages(
    @Query() dto: GetEquipmentTypeProductUsagesRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetEquipmentTypeProductUsagesResponseDto> {
    return this.queryBus.execute<GetEquipmentTypeProductUsagesQuery, GetEquipmentTypeProductUsagesResult>(
      new GetEquipmentTypeProductUsagesQuery(user.tenantId, dto.equipmentTypeIds),
    );
  }
}
