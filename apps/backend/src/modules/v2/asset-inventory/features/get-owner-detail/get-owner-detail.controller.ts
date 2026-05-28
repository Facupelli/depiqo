import { Controller, Get, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';
import { GetOwnerDetailResult } from './get-owner-detail.handler';
import { toGetOwnerDetailProblem } from './get-owner-detail-http-error.mapper';
import { GetOwnerDetailQuery } from './get-owner-detail.query';
import { GetOwnerDetailParamsDto } from './get-owner-detail.request.dto';
import type { GetOwnerDetailResponseDto } from './get-owner-detail.response.dto';

@Controller('v2/asset-inventory/owners')
export class GetOwnerDetailHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':ownerId')
  async getOwnerDetail(
    @Param() params: GetOwnerDetailParamsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GetOwnerDetailResponseDto> {
    const result = await this.queryBus.execute<GetOwnerDetailQuery, GetOwnerDetailResult>(
      new GetOwnerDetailQuery(user.tenantId, params.ownerId),
    );

    if (result.isErr()) {
      throw toGetOwnerDetailProblem(result.error);
    }

    return result.value;
  }
}
