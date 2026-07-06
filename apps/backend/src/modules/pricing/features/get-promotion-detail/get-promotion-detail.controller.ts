import { Controller, Get, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { GetPromotionDetailApplicationError } from './get-promotion-detail-application.error';
import { GetPromotionDetailResult } from './get-promotion-detail.handler';
import { toGetPromotionDetailProblem } from './get-promotion-detail-http-error.mapper';
import { GetPromotionDetailQuery } from './get-promotion-detail.query';
import { GetPromotionDetailParamsDto } from './get-promotion-detail.request.dto';
import { GetPromotionDetailResponseDto } from './get-promotion-detail.response.dto';

@Controller('pricing/promotions')
export class GetPromotionDetailHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':promotionId')
  async getPromotionDetail(
    @Param() params: GetPromotionDetailParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetPromotionDetailResponseDto> {
    const result = await this.queryBus.execute<
      GetPromotionDetailQuery,
      Result<GetPromotionDetailResult, GetPromotionDetailApplicationError>
    >(
      new GetPromotionDetailQuery({
        tenantId: user.tenantId,
        promotionId: params.promotionId,
      }),
    );

    if (result.isErr()) {
      throw toGetPromotionDetailProblem(result.error);
    }

    return result.value;
  }
}
