import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { GetEquipmentTypeSummariesResult } from './get-equipment-type-summaries.handler';
import { GetEquipmentTypeSummariesQuery } from './get-equipment-type-summaries.query';
import { GetEquipmentTypeSummariesRequestDto } from './get-equipment-type-summaries.request.dto';
import type { GetEquipmentTypeSummariesResponseDto } from './get-equipment-type-summaries.response.dto';

@Controller('asset-inventory/equipment-types')
export class GetEquipmentTypeSummariesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getEquipmentTypeSummaries(
    @Query() dto: GetEquipmentTypeSummariesRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetEquipmentTypeSummariesResponseDto> {
    return this.queryBus.execute<GetEquipmentTypeSummariesQuery, GetEquipmentTypeSummariesResult>(
      new GetEquipmentTypeSummariesQuery(user.tenantId, dto.isActive, dto.search, dto.branchId, dto.page, dto.pageSize),
    );
  }
}
