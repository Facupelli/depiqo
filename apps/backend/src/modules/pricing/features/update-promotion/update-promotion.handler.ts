import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { PromotionEffectType } from 'src/generated/prisma/client';

import { updatePromotionApplicationError, UpdatePromotionApplicationError } from './update-promotion-application.error';
import { UpdatePromotionCommand } from './update-promotion.command';

export interface UpdatePromotionResult {
  id: string;
}

@CommandHandler(UpdatePromotionCommand)
export class UpdatePromotionHandler implements ICommandHandler<
  UpdatePromotionCommand,
  Result<UpdatePromotionResult, UpdatePromotionApplicationError>
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    command: UpdatePromotionCommand,
  ): Promise<Result<UpdatePromotionResult, UpdatePromotionApplicationError>> {
    const validationError = validatePromotion(command);

    if (validationError) {
      return err(validationError);
    }

    const updatedPromotion = await this.prisma.client.$transaction(async (tx) => {
      const existingPromotion = await tx.v2Promotion.findFirst({
        where: {
          id: command.promotionId,
          tenantId: command.tenantId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!existingPromotion) {
        return null;
      }

      const promotion = await tx.v2Promotion.update({
        where: { id: command.promotionId },
        data: {
          name: command.name.trim(),
          activation: command.activation,
          priority: command.priority,
          stackable: command.stackable,
          isActive: command.isActive,
          validFrom: command.validFrom ? new Date(command.validFrom) : null,
          validUntil: command.validUntil ? new Date(command.validUntil) : null,
          effectType: command.effectType,
          effectValue: command.effectValue,
          target: command.target,
          minOrderSubtotal: command.minOrderSubtotal ?? null,
          minRentalUnits: command.minRentalUnits ?? null,
          maxRentalUnits: command.maxRentalUnits ?? null,
        },
        select: { id: true },
      });

      await tx.v2PromotionScope.deleteMany({
        where: {
          tenantId: command.tenantId,
          promotionId: command.promotionId,
        },
      });

      await tx.v2PromotionExclusion.deleteMany({
        where: {
          tenantId: command.tenantId,
          promotionId: command.promotionId,
        },
      });

      await tx.v2PromotionScope.createMany({
        data: command.scopes.map((scope) => ({
          tenantId: command.tenantId,
          promotionId: promotion.id,
          appliesToAll: scope.type === 'ALL',
          rentableItemId: scope.type === 'RENTABLE_ITEM' ? scope.rentableItemId : null,
          rentalOfferId: scope.type === 'RENTAL_OFFER' ? scope.rentalOfferId : null,
          categoryId: scope.type === 'CATEGORY' ? scope.categoryId : null,
        })),
      });

      if (command.exclusions.length > 0) {
        await tx.v2PromotionExclusion.createMany({
          data: command.exclusions.map((exclusion) => ({
            tenantId: command.tenantId,
            promotionId: promotion.id,
            rentableItemId: exclusion.type === 'RENTABLE_ITEM' ? exclusion.rentableItemId : null,
            rentalOfferId: exclusion.type === 'RENTAL_OFFER' ? exclusion.rentalOfferId : null,
            categoryId: exclusion.type === 'CATEGORY' ? exclusion.categoryId : null,
          })),
        });
      }

      return promotion;
    });

    if (!updatedPromotion) {
      return err(updatePromotionApplicationError('PromotionNotFound', 'Promotion not found.'));
    }

    return ok({ id: updatedPromotion.id });
  }
}

function validatePromotion(command: UpdatePromotionCommand): UpdatePromotionApplicationError | undefined {
  if (command.scopes.length === 0) {
    return updatePromotionApplicationError(
      'InvalidPromotionConfiguration',
      'A promotion must have at least one scope.',
    );
  }

  if (command.validFrom && command.validUntil && new Date(command.validUntil) <= new Date(command.validFrom)) {
    return updatePromotionApplicationError('InvalidPromotionConfiguration', 'validUntil must be after validFrom.');
  }

  const effectValue = Number(command.effectValue);

  if (!Number.isFinite(effectValue) || effectValue <= 0) {
    return updatePromotionApplicationError('InvalidPromotionConfiguration', 'effectValue must be greater than zero.');
  }

  if (command.effectType === PromotionEffectType.PERCENTAGE_OFF && effectValue > 100) {
    return updatePromotionApplicationError(
      'InvalidPromotionConfiguration',
      'Percentage discount effectValue must be less than or equal to 100.',
    );
  }

  if (
    command.minRentalUnits !== undefined &&
    command.maxRentalUnits !== undefined &&
    command.minRentalUnits > command.maxRentalUnits
  ) {
    return updatePromotionApplicationError(
      'InvalidPromotionConfiguration',
      'minRentalUnits must be less than or equal to maxRentalUnits.',
    );
  }

  if (hasDuplicateTargets(command.scopes.map(scopeTargetKey))) {
    return updatePromotionApplicationError('DuplicatePromotionTarget', 'Promotion scopes contain duplicate targets.');
  }

  if (hasDuplicateTargets(command.exclusions.map(exclusionTargetKey))) {
    return updatePromotionApplicationError(
      'DuplicatePromotionTarget',
      'Promotion exclusions contain duplicate targets.',
    );
  }

  return undefined;
}

function hasDuplicateTargets(keys: string[]): boolean {
  return new Set(keys).size !== keys.length;
}

function scopeTargetKey(scope: UpdatePromotionCommand['scopes'][number]): string {
  switch (scope.type) {
    case 'ALL':
      return 'ALL';
    case 'RENTABLE_ITEM':
      return `RENTABLE_ITEM:${scope.rentableItemId}`;
    case 'RENTAL_OFFER':
      return `RENTAL_OFFER:${scope.rentalOfferId}`;
    case 'CATEGORY':
      return `CATEGORY:${scope.categoryId}`;
  }
}

function exclusionTargetKey(exclusion: UpdatePromotionCommand['exclusions'][number]): string {
  switch (exclusion.type) {
    case 'RENTABLE_ITEM':
      return `RENTABLE_ITEM:${exclusion.rentableItemId}`;
    case 'RENTAL_OFFER':
      return `RENTAL_OFFER:${exclusion.rentalOfferId}`;
    case 'CATEGORY':
      return `CATEGORY:${exclusion.categoryId}`;
  }
}
