import { Body, Controller, HttpCode, HttpStatus, Param, Put } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { CorrectRatePlanCommand } from './correct-rate-plan.command';
import { CorrectRatePlanError, CorrectRatePlanErrorCode } from './correct-rate-plan.errors';
import { CorrectRatePlanResult } from './correct-rate-plan.handler';
import { CorrectRatePlanParamsDto, CorrectRatePlanRequestDto } from './correct-rate-plan.request.dto';
import { CorrectRatePlanResponseDto } from './correct-rate-plan.response.dto';

@Controller('pricing/rate-plans')
export class CorrectRatePlanHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put(':ratePlanId')
  @HttpCode(HttpStatus.OK)
  async correctRatePlan(
    @Param() params: CorrectRatePlanParamsDto,
    @Body() dto: CorrectRatePlanRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CorrectRatePlanResponseDto> {
    const result = await this.commandBus.execute<
      CorrectRatePlanCommand,
      Result<CorrectRatePlanResult, CorrectRatePlanError>
    >(
      new CorrectRatePlanCommand({
        tenantId: user.tenantId,
        ratePlanId: params.ratePlanId,
        name: dto.name,
        billingUnit: dto.billingUnit,
        currency: dto.currency,
        tiers: dto.tiers,
        expectedAffectedRentalOfferIds: dto.expectedAffectedRentalOfferIds,
      }),
    );

    if (result.isErr()) {
      throw toCorrectRatePlanProblem(result.error);
    }

    return result.value;
  }
}

function toCorrectRatePlanProblem(error: CorrectRatePlanError): ProblemException {
  const problem = correctRatePlanProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      ...problem,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const correctRatePlanProblemMap = {
  'pricing.rate_plan_not_found': {
    type: createProblemType('pricing.rate_plan_not_found'),
    title: 'Rate plan not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The rate plan could not be found.',
  },
  'pricing.rate_plan_name_already_in_use': {
    type: createProblemType('pricing.rate_plan_name_already_in_use'),
    title: 'Rate plan name already in use',
    status: HttpStatus.CONFLICT,
    detail: 'A rate plan with the requested name already exists.',
  },
  'pricing.rate_plan_impact_changed': {
    type: createProblemType('pricing.rate_plan_impact_changed'),
    title: 'Rate plan impact changed',
    status: HttpStatus.CONFLICT,
    detail: 'The offers assigned to this rate plan changed. Review and acknowledge the current impact before retrying.',
  },
  'pricing.invalid_rate_plan': {
    type: createProblemType('pricing.invalid_rate_plan'),
    title: 'Invalid rate plan',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rate plan could not be corrected because it violates pricing rules.',
  },
} satisfies Record<CorrectRatePlanErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
