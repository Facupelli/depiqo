import { GetPromotionsResponseDto } from '@repo/api-contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

import { GetPromotionsQuery } from './get-promotions.query';
import { prismaDateToLocalDate } from '../../pricing-engine/shared/local-date';

export type GetPromotionsResult = GetPromotionsResponseDto;

@QueryHandler(GetPromotionsQuery)
export class GetPromotionsHandler implements IQueryHandler<GetPromotionsQuery, GetPromotionsResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetPromotionsQuery): Promise<GetPromotionsResult> {
    const promotions = await this.prisma.client.v2Promotion.findMany({
      where: {
        tenantId: query.tenantId,
        deletedAt: null,
        ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
        ...(query.activation === undefined ? {} : { activation: query.activation }),
        ...(query.effectType === undefined ? {} : { effectType: query.effectType }),
        ...(query.target === undefined ? {} : { target: query.target }),
        ...(query.search === undefined ? {} : { name: { contains: query.search, mode: 'insensitive' } }),
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
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return promotions.map((promotion) => ({
      id: promotion.id,
      name: promotion.name,
      activation: promotion.activation,
      priority: promotion.priority,
      stackable: promotion.stackable,
      isActive: promotion.isActive,
      validFrom: promotion.validFrom ? prismaDateToLocalDate(promotion.validFrom) : null,
      validUntil: promotion.validUntil ? prismaDateToLocalDate(promotion.validUntil) : null,
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
    }));
  }
}
