import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { GetRatePlanDetailError, GetRatePlanDetailErrorCode } from './get-rate-plan-detail.errors';
import { GetRatePlanDetailResult } from './get-rate-plan-detail.handler';
import { GetRatePlanDetailQuery } from './get-rate-plan-detail.query';
import { GetRatePlanDetailParamsDto } from './get-rate-plan-detail.request.dto';
import { GetRatePlanDetailResponseDto } from './get-rate-plan-detail.response.dto';

@Controller('pricing/rate-plans')
export class GetRatePlanDetailHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':ratePlanId')
  async getRatePlanDetail(
    @Param() params: GetRatePlanDetailParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRatePlanDetailResponseDto> {
    const result = await this.queryBus.execute<
      GetRatePlanDetailQuery,
      Result<GetRatePlanDetailResult, GetRatePlanDetailError>
    >(
      new GetRatePlanDetailQuery({
        tenantId: user.tenantId,
        ratePlanId: params.ratePlanId,
      }),
    );

    if (result.isErr()) {
      throw toGetRatePlanDetailProblem(result.error);
    }

    return result.value;
  }
}

function toGetRatePlanDetailProblem(error: GetRatePlanDetailError): ProblemException {
  const problem = getRatePlanDetailProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      ...problem,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const getRatePlanDetailProblemMap = {
  'pricing.rate_plan_not_found': {
    type: createProblemType('pricing.rate_plan_not_found'),
    title: 'Rate plan not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rate plan was not found.',
  },
} satisfies Record<GetRatePlanDetailErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
