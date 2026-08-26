import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { CreateRatePlanCommand } from './create-rate-plan.command';
import { CreateRatePlanError, CreateRatePlanErrorCode } from './create-rate-plan.errors';
import { CreateRatePlanResult } from './create-rate-plan.handler';
import { CreateRatePlanRequestDto } from './create-rate-plan.request.dto';
import { CreateRatePlanResponseDto } from './create-rate-plan.response.dto';

@Controller('pricing/rate-plans')
export class CreateRatePlanHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRatePlan(
    @Body() dto: CreateRatePlanRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateRatePlanResponseDto> {
    const result = await this.commandBus.execute<
      CreateRatePlanCommand,
      Result<CreateRatePlanResult, CreateRatePlanError>
    >(
      new CreateRatePlanCommand({
        tenantId: user.tenantId,
        name: dto.name,
        billingUnit: dto.billingUnit,
        currency: dto.currency,
        isActive: dto.isActive,
        tiers: dto.tiers.map((tier) => ({
          fromUnit: tier.fromUnit,
          toUnit: tier.toUnit,
          pricePerUnit: tier.pricePerUnit,
        })),
      }),
    );

    if (result.isErr()) {
      throw toCreateRatePlanProblem(result.error);
    }

    return result.value;
  }
}

function toCreateRatePlanProblem(error: CreateRatePlanError): ProblemException {
  const problem = createRatePlanProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      ...problem,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const createRatePlanProblemMap = {
  'pricing.rate_plan_name_already_in_use': {
    type: createProblemType('pricing.rate_plan_name_already_in_use'),
    title: 'Rate plan name already in use',
    status: HttpStatus.CONFLICT,
    detail: 'A rate plan with the requested name already exists.',
  },
  'pricing.invalid_rate_plan': {
    type: createProblemType('pricing.invalid_rate_plan'),
    title: 'Invalid rate plan',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rate plan could not be created because it violates pricing rules.',
  },
} satisfies Record<CreateRatePlanErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
