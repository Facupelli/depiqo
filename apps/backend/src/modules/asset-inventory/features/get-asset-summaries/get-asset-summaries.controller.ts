import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { GetAssetSummariesResult } from './get-asset-summaries.handler';
import { GetAssetSummariesQuery } from './get-asset-summaries.query';
import { GetAssetSummariesRequestDto } from './get-asset-summaries.request.dto';
import type { GetAssetSummariesResponseDto } from './get-asset-summaries.response.dto';

@Controller('asset-inventory/asset-summaries')
export class GetAssetSummariesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getAssetSummaries(
    @Query() dto: GetAssetSummariesRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetAssetSummariesResponseDto> {
    return this.queryBus.execute<GetAssetSummariesQuery, GetAssetSummariesResult>(
      new GetAssetSummariesQuery(user.tenantId, dto.ids),
    );
  }
}
