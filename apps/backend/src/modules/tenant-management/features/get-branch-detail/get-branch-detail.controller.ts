import { Controller, Get, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { GetBranchDetailResult } from './get-branch-detail.handler';
import { toGetBranchDetailProblem } from './get-branch-detail-http-error.mapper';
import { GetBranchDetailQuery } from './get-branch-detail.query';
import { GetBranchDetailParamsDto } from './get-branch-detail.request.dto';
import { GetBranchDetailResponseDto } from './get-branch-detail.response.dto';

@Controller('v2/tenant-management/branches')
export class GetBranchDetailHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':branchId')
  async getBranchDetail(
    @Param() params: GetBranchDetailParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetBranchDetailResponseDto> {
    const result = await this.queryBus.execute<GetBranchDetailQuery, GetBranchDetailResult>(
      new GetBranchDetailQuery(user.tenantId, params.branchId),
    );

    if (result.isErr()) {
      throw toGetBranchDetailProblem(result.error);
    }

    return result.value;
  }
}
