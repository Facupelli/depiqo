import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { PromotionEffectType } from 'src/generated/prisma/client';

import { CreatePromotionError, createPromotionError } from './create-promotion.errors';
import { CreatePromotionCommand } from './create-promotion.command';

export interface CreatePromotionResult {
  id: string;
}

@CommandHandler(CreatePromotionCommand)
export class CreatePromotionHandler implements ICommandHandler<
  CreatePromotionCommand,
  Result<CreatePromotionResult, CreatePromotionError>
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreatePromotionCommand): Promise<Result<CreatePromotionResult, CreatePromotionError>> {
    const validationError = validatePromotion(command, {
      useCase: 'CreatePromotion',
      tenantId: command.tenantId,
    });

    if (validationError) {
      return err(validationError);
    }

    const promotion = await this.prisma.client.$transaction(async (tx) => {
      const createdPromotion = await tx.v2Promotion.create({
        data: {
          tenantId: command.tenantId,
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

      await tx.v2PromotionScope.createMany({
        data: command.scopes.map((scope) => ({
          tenantId: command.tenantId,
          promotionId: createdPromotion.id,
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
            promotionId: createdPromotion.id,
            rentableItemId: exclusion.type === 'RENTABLE_ITEM' ? exclusion.rentableItemId : null,
            rentalOfferId: exclusion.type === 'RENTAL_OFFER' ? exclusion.rentalOfferId : null,
            categoryId: exclusion.type === 'CATEGORY' ? exclusion.categoryId : null,
          })),
        });
      }

      return createdPromotion;
    });

    return ok({ id: promotion.id });
  }
}

function validatePromotion(
  command: CreatePromotionCommand,
  context: Record<string, unknown>,
): CreatePromotionError | undefined {
  const promotionError = (code: CreatePromotionError['code'], message: string): CreatePromotionError =>
    createPromotionError(code, message, undefined, context);

  if (command.scopes.length === 0) {
    return promotionError('pricing.invalid_promotion_configuration', 'A promotion must have at least one scope.');
  }

  if (command.validFrom && command.validUntil && new Date(command.validUntil) <= new Date(command.validFrom)) {
    return promotionError('pricing.invalid_promotion_configuration', 'validUntil must be after validFrom.');
  }

  const effectValue = Number(command.effectValue);

  if (!Number.isFinite(effectValue) || effectValue <= 0) {
    return promotionError('pricing.invalid_promotion_configuration', 'effectValue must be greater than zero.');
  }

  if (command.effectType === PromotionEffectType.PERCENTAGE_OFF && effectValue > 100) {
    return promotionError(
      'pricing.invalid_promotion_configuration',
      'Percentage discount effectValue must be less than or equal to 100.',
    );
  }

  if (
    command.minRentalUnits !== undefined &&
    command.maxRentalUnits !== undefined &&
    command.minRentalUnits > command.maxRentalUnits
  ) {
    return promotionError(
      'pricing.invalid_promotion_configuration',
      'minRentalUnits must be less than or equal to maxRentalUnits.',
    );
  }

  if (hasDuplicateTargets(command.scopes.map(scopeTargetKey))) {
    return promotionError('pricing.duplicate_promotion_target', 'Promotion scopes contain duplicate targets.');
  }

  if (hasDuplicateTargets(command.exclusions.map(exclusionTargetKey))) {
    return promotionError('pricing.duplicate_promotion_target', 'Promotion exclusions contain duplicate targets.');
  }

  return undefined;
}

function hasDuplicateTargets(keys: string[]): boolean {
  return new Set(keys).size !== keys.length;
}

function scopeTargetKey(scope: CreatePromotionCommand['scopes'][number]): string {
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

function exclusionTargetKey(exclusion: CreatePromotionCommand['exclusions'][number]): string {
  switch (exclusion.type) {
    case 'RENTABLE_ITEM':
      return `RENTABLE_ITEM:${exclusion.rentableItemId}`;
    case 'RENTAL_OFFER':
      return `RENTAL_OFFER:${exclusion.rentalOfferId}`;
    case 'CATEGORY':
      return `CATEGORY:${exclusion.categoryId}`;
  }
}
