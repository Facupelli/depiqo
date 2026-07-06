import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { CreateRatePlanApplicationError } from './create-rate-plan-application.error';
import { CreateRatePlanCommand } from './create-rate-plan.command';
import { toCreateRatePlanProblem } from './create-rate-plan-http-error.mapper';
import { CreateRatePlanRequestDto } from './create-rate-plan.request.dto';
import { CreateRatePlanResponseDto } from './create-rate-plan.response.dto';
import { CreateRatePlanResult } from './create-rate-plan.handler';

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
      Result<CreateRatePlanResult, CreateRatePlanApplicationError>
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
