import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { GetPromotionDetailError, GetPromotionDetailErrorCode } from './get-promotion-detail.errors';
import { GetPromotionDetailResult } from './get-promotion-detail.handler';
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
      Result<GetPromotionDetailResult, GetPromotionDetailError>
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

function toGetPromotionDetailProblem(error: GetPromotionDetailError): ProblemException {
  const problem = getPromotionDetailProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      ...problem,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const getPromotionDetailProblemMap = {
  'pricing.promotion_not_found': {
    type: createProblemType('pricing.promotion_not_found'),
    title: 'Promotion not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested promotion was not found.',
  },
} satisfies Record<GetPromotionDetailErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
