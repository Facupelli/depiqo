import { GetPromotionDetailResponseDto } from '@repo/api-contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  getPromotionDetailApplicationError,
  GetPromotionDetailApplicationError,
} from './get-promotion-detail-application.error';
import { GetPromotionDetailQuery } from './get-promotion-detail.query';

export type GetPromotionDetailResult = GetPromotionDetailResponseDto;

@QueryHandler(GetPromotionDetailQuery)
export class GetPromotionDetailHandler implements IQueryHandler<
  GetPromotionDetailQuery,
  Result<GetPromotionDetailResult, GetPromotionDetailApplicationError>
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetPromotionDetailQuery,
  ): Promise<Result<GetPromotionDetailResult, GetPromotionDetailApplicationError>> {
    const promotion = await this.prisma.client.v2Promotion.findFirst({
      where: {
        id: query.promotionId,
        tenantId: query.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        activation: true,
        priority: true,
        stackable: true,
        isActive: true,
        validFrom: true,
        validUntil: true,
        effectType: true,
        effectValue: true,
        target: true,
        minOrderSubtotal: true,
        minRentalUnits: true,
        maxRentalUnits: true,
        createdAt: true,
        updatedAt: true,
        scopes: {
          select: {
            appliesToAll: true,
            rentableItemId: true,
            rentalOfferId: true,
            categoryId: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        exclusions: {
          select: {
            rentableItemId: true,
            rentalOfferId: true,
            categoryId: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!promotion) {
      return err(getPromotionDetailApplicationError('PromotionNotFound', 'Promotion not found.'));
    }

    return ok({
      id: promotion.id,
      name: promotion.name,
      activation: promotion.activation,
      priority: promotion.priority,
      stackable: promotion.stackable,
      isActive: promotion.isActive,
      validFrom: promotion.validFrom?.toISOString() ?? null,
      validUntil: promotion.validUntil?.toISOString() ?? null,
      effectType: promotion.effectType,
      effectValue: promotion.effectValue.toString(),
      target: promotion.target,
      minOrderSubtotal: promotion.minOrderSubtotal?.toString() ?? null,
      minRentalUnits: promotion.minRentalUnits,
      maxRentalUnits: promotion.maxRentalUnits,
      scopes: promotion.scopes.map((scope) => {
        if (scope.appliesToAll) return { type: 'ALL' as const };
        if (scope.rentableItemId) return { type: 'RENTABLE_ITEM' as const, rentableItemId: scope.rentableItemId };
        if (scope.rentalOfferId) return { type: 'RENTAL_OFFER' as const, rentalOfferId: scope.rentalOfferId };
        if (scope.categoryId) return { type: 'CATEGORY' as const, categoryId: scope.categoryId };

        throw new Error(`Promotion scope has no target: ${promotion.id}`);
      }),
      exclusions: promotion.exclusions.map((exclusion) => {
        if (exclusion.rentableItemId) {
          return { type: 'RENTABLE_ITEM' as const, rentableItemId: exclusion.rentableItemId };
        }
        if (exclusion.rentalOfferId) return { type: 'RENTAL_OFFER' as const, rentalOfferId: exclusion.rentalOfferId };
        if (exclusion.categoryId) return { type: 'CATEGORY' as const, categoryId: exclusion.categoryId };

        throw new Error(`Promotion exclusion has no target: ${promotion.id}`);
      }),
      createdAt: promotion.createdAt.toISOString(),
      updatedAt: promotion.updatedAt.toISOString(),
    });
  }
}
