import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { GetRentableItemSummariesResult } from './get-rentable-item-summaries.handler';
import { GetRentableItemSummariesQuery } from './get-rentable-item-summaries.query';
import { GetRentableItemSummariesRequestDto } from './get-rentable-item-summaries.request.dto';
import type { GetRentableItemSummariesResponseDto } from './get-rentable-item-summaries.response.dto';

@Controller('catalog/rentable-item-summaries')
export class GetRentableItemSummariesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getRentableItemSummaries(
    @Query() dto: GetRentableItemSummariesRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRentableItemSummariesResponseDto> {
    return this.queryBus.execute<GetRentableItemSummariesQuery, GetRentableItemSummariesResult>(
      new GetRentableItemSummariesQuery(user.tenantId, dto.ids),
    );
  }
}
