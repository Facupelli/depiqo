import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { V2BillingUnit } from 'src/generated/prisma/client';

import { RatePlanDomainError } from '../../domain/errors/rate-plan.errors';
import { RatePlan } from '../../domain/rate-plan.aggregate';
import { RatePlanMapper } from '../../persistence/rate-plan.mapper';

export type CreateRatePlanOperationError =
  | { code: 'RatePlanNameAlreadyInUse'; message: string }
  | { code: 'InvalidRatePlan'; message: string; cause: RatePlanDomainError };

export interface CreateRatePlanOperationInput {
  tenantId: string;
  name: string;
  billingUnit: V2BillingUnit;
  currency: string;
  isActive: boolean;
  tiers: Array<{ fromUnit: number; toUnit?: number | null; pricePerUnit: string }>;
}

export interface CreateRatePlanOperationResult {
  ratePlan: RatePlan;
}

@Injectable()
export class CreateRatePlanOperation {
  constructor(private readonly prisma: PrismaService) {}

  async createRatePlan(
    input: CreateRatePlanOperationInput,
  ): Promise<Result<CreateRatePlanOperationResult, CreateRatePlanOperationError>> {
    const name = input.name.trim();
    const existingRatePlan = await this.prisma.client.v2RatePlan.findFirst({
      where: {
        tenantId: input.tenantId,
        name,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existingRatePlan) {
      return err({ code: 'RatePlanNameAlreadyInUse', message: 'A rate plan with the requested name already exists.' });
    }

    const ratePlan = RatePlan.create({
      tenantId: input.tenantId,
      name,
      billingUnit: input.billingUnit,
      currency: input.currency,
      isActive: input.isActive,
      tiers: input.tiers,
    });

    if (ratePlan.isErr()) {
      return err({ code: 'InvalidRatePlan', message: ratePlan.error.message, cause: ratePlan.error });
    }

    await this.prisma.client.v2RatePlan.create({ data: RatePlanMapper.toCreateData(ratePlan.value) });

    return ok({ ratePlan: ratePlan.value });
  }
}
