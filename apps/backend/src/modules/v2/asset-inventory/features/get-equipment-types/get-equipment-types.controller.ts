import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';
import { GetEquipmentTypesResult } from './get-equipment-types.handler';
import { GetEquipmentTypesQuery } from './get-equipment-types.query';
import { GetEquipmentTypesRequestDto } from './get-equipment-types.request.dto';
import type { GetEquipmentTypesResponseDto } from './get-equipment-types.response.dto';

@Controller('v2/asset-inventory/equipment-type-options')
export class GetEquipmentTypesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getEquipmentTypes(
    @Query() dto: GetEquipmentTypesRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GetEquipmentTypesResponseDto> {
    return this.queryBus.execute<GetEquipmentTypesQuery, GetEquipmentTypesResult>(
      new GetEquipmentTypesQuery(user.tenantId, dto.isActive, dto.search, dto.limit),
    );
  }
}
