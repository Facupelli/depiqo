import { Controller, Get, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { GetRentableItemDetailApplicationError } from './get-rentable-item-detail-application.error';
import type { GetRentableItemDetailReadModel } from './get-rentable-item-detail.handler';
import { toGetRentableItemDetailProblem } from './get-rentable-item-detail-http-error.mapper';
import { GetRentableItemDetailQuery } from './get-rentable-item-detail.query';
import { GetRentableItemDetailRequestDto } from './get-rentable-item-detail.request.dto';
import type { GetRentableItemDetailResponseDto } from './get-rentable-item-detail.response.dto';

@Controller('catalog/rentable-items')
export class GetRentableItemDetailHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':rentableItemId')
  async getRentableItemDetail(
    @Param() params: GetRentableItemDetailRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRentableItemDetailResponseDto> {
    const result = await this.queryBus.execute<
      GetRentableItemDetailQuery,
      Result<GetRentableItemDetailReadModel, GetRentableItemDetailApplicationError>
    >(new GetRentableItemDetailQuery(user.tenantId, params.rentableItemId));

    if (result.isErr()) {
      throw toGetRentableItemDetailProblem(result.error);
    }

    return result.value;
  }
}
