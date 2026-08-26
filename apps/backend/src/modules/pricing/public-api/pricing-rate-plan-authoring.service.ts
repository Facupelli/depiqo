import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { V2BillingUnit } from 'src/generated/prisma/client';

import { CreateRatePlanCommand } from '../features/create-rate-plan/create-rate-plan.command';
import { CreateRatePlanError } from '../features/create-rate-plan/create-rate-plan.errors';
import { CreateRatePlanResult } from '../features/create-rate-plan/create-rate-plan.handler';
import {
  CreatePricingRatePlanInput,
  CreatePricingRatePlanResult,
  PricingRatePlanAuthoring,
  PricingRatePlanAuthoringError,
  PricingRatePlanBillingUnit,
} from './pricing-rate-plan-authoring.public-api';

@Injectable()
export class PricingRatePlanAuthoringService extends PricingRatePlanAuthoring {
  constructor(private readonly commandBus: CommandBus) {
    super();
  }

  async createRatePlan(
    input: CreatePricingRatePlanInput,
  ): Promise<Result<CreatePricingRatePlanResult, PricingRatePlanAuthoringError>> {
    const result = await this.commandBus.execute<
      CreateRatePlanCommand,
      Result<CreateRatePlanResult, CreateRatePlanError>
    >(
      new CreateRatePlanCommand({
        ...input,
        billingUnit: toPersistenceBillingUnit(input.billingUnit),
      }),
    );

    return result
      .map((value) => ({ ratePlanId: value.id }))
      .mapErr(
        (error) =>
          new PricingRatePlanAuthoringError(
            error.code === 'pricing.rate_plan_name_already_in_use' ? 'RatePlanNameAlreadyInUse' : 'InvalidRatePlan',
            error.message,
          ),
      );
  }
}

function toPersistenceBillingUnit(billingUnit: PricingRatePlanBillingUnit): V2BillingUnit {
  const billingUnitByPublicValue = {
    HOUR: V2BillingUnit.HOUR,
    DAY: V2BillingUnit.DAY,
    WEEK: V2BillingUnit.WEEK,
  } as const;

  return billingUnitByPublicValue[billingUnit];
}
