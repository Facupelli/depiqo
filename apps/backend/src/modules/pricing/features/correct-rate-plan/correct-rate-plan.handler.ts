import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { RatePlanRepository } from '../../persistence/rate-plan.repository';
import { CorrectRatePlanCommand } from './correct-rate-plan.command';
import { correctRatePlanError, CorrectRatePlanError } from './correct-rate-plan.errors';

export interface CorrectRatePlanResult {
  id: string;
  affectedRentalOfferIds: string[];
}

@CommandHandler(CorrectRatePlanCommand)
export class CorrectRatePlanHandler implements ICommandHandler<
  CorrectRatePlanCommand,
  Result<CorrectRatePlanResult, CorrectRatePlanError>
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ratePlanRepository: RatePlanRepository,
  ) {}

  async execute(command: CorrectRatePlanCommand): Promise<Result<CorrectRatePlanResult, CorrectRatePlanError>> {
    const context = {
      useCase: 'CorrectRatePlan',
      tenantId: command.tenantId,
      ratePlanId: command.ratePlanId,
    };

    return this.prisma.client.$transaction(
      async (tx) => {
        const ratePlan = await this.ratePlanRepository.findById(command.ratePlanId, command.tenantId, tx);

        if (!ratePlan) {
          return err(correctRatePlanError('pricing.rate_plan_not_found', 'Rate plan not found.', undefined, context));
        }

        const existingRatePlan = await tx.v2RatePlan.findFirst({
          where: {
            tenantId: command.tenantId,
            name: command.name.trim(),
            deletedAt: null,
            id: { not: ratePlan.id },
          },
          select: { id: true },
        });

        if (existingRatePlan) {
          return err(
            correctRatePlanError(
              'pricing.rate_plan_name_already_in_use',
              'A rate plan with the requested name already exists.',
              undefined,
              context,
            ),
          );
        }

        const assignments = await tx.v2RentalOfferPricing.findMany({
          where: {
            ratePlanId: ratePlan.id,
            tenantId: command.tenantId,
            deletedAt: null,
          },
          select: { catalogRentalOfferId: true },
          orderBy: { catalogRentalOfferId: 'asc' },
        });
        const affectedRentalOfferIds = assignments.map((assignment) => assignment.catalogRentalOfferId);

        if (!haveSameIds(affectedRentalOfferIds, command.expectedAffectedRentalOfferIds)) {
          return err(
            correctRatePlanError(
              'pricing.rate_plan_impact_changed',
              'The rate plan assignments changed after their impact was acknowledged.',
              undefined,
              context,
            ),
          );
        }

        const correctedRatePlan = ratePlan.correct({
          name: command.name,
          billingUnit: command.billingUnit,
          currency: command.currency,
          tiers: command.tiers,
        });

        if (correctedRatePlan.isErr()) {
          return err(
            correctRatePlanError(
              'pricing.invalid_rate_plan',
              correctedRatePlan.error.message,
              correctedRatePlan.error,
              context,
            ),
          );
        }

        await this.ratePlanRepository.save(correctedRatePlan.value, tx);

        return ok({ id: ratePlan.id, affectedRentalOfferIds });
      },
      { isolationLevel: 'Serializable' },
    );
  }
}

function haveSameIds(actualIds: string[], expectedIds: string[]): boolean {
  if (actualIds.length !== expectedIds.length) {
    return false;
  }

  const expectedIdSet = new Set(expectedIds);
  return actualIds.every((id) => expectedIdSet.has(id));
}
