import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { GetBranchesResult } from './get-branches.handler';
import { GetBranchesQuery } from './get-branches.query';
import { GetBranchesRequestDto } from './get-branches.request.dto';
import type { GetBranchesResponseDto } from './get-branches.response.dto';

@Controller('tenant-management/branches')
export class GetBranchesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getBranches(
    @Query() dto: GetBranchesRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetBranchesResponseDto> {
    return this.queryBus.execute<GetBranchesQuery, GetBranchesResult>(
      new GetBranchesQuery(user.tenantId, dto.isActive),
    );
  }
}
