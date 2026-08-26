import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { GetRatePlansResult } from './get-rate-plans.handler';
import { GetRatePlansQuery } from './get-rate-plans.query';
import { GetRatePlansRequestDto } from './get-rate-plans.request.dto';
import type { GetRatePlansResponseDto } from './get-rate-plans.response.dto';

@Controller('pricing/rate-plans')
export class GetRatePlansHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getRatePlans(
    @Query() dto: GetRatePlansRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRatePlansResponseDto> {
    return this.queryBus.execute<GetRatePlansQuery, GetRatePlansResult>(
      new GetRatePlansQuery({ tenantId: user.tenantId, isActive: dto.isActive }),
    );
  }
}
