import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedDto, ProductTypeResponse } from '@repo/schemas';
import { RentalItemKind, TrackingMode } from '@repo/types';
import { Result, err, ok } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  AccessoryLinkPrimaryMustBePrimaryError,
  ProductTypeNotFoundError,
} from 'src/modules/catalog/domain/errors/catalog.errors';

import { GetAvailableAccessoriesQuery } from './get-available-accessories.query';

type ProductTypeIncludedItemReadModel = {
  name: string;
  quantity: number;
  notes: string | null;
};

type GetAvailableAccessoriesResult = Result<
  PaginatedDto<ProductTypeResponse>,
  ProductTypeNotFoundError | AccessoryLinkPrimaryMustBePrimaryError
>;

@QueryHandler(GetAvailableAccessoriesQuery)
export class GetAvailableAccessoriesQueryHandler implements IQueryHandler<
  GetAvailableAccessoriesQuery,
  GetAvailableAccessoriesResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetAvailableAccessoriesQuery): Promise<GetAvailableAccessoriesResult> {
    const primaryRentalItem = await this.prisma.client.productType.findFirst({
      where: { id: query.primaryRentalItemId, tenantId: query.tenantId },
      select: { id: true, kind: true },
    });

    if (!primaryRentalItem) {
      return err(new ProductTypeNotFoundError(query.primaryRentalItemId));
    }

    if (primaryRentalItem.kind !== RentalItemKind.PRIMARY) {
      return err(new AccessoryLinkPrimaryMustBePrimaryError(primaryRentalItem.id));
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId: query.tenantId,
      kind: RentalItemKind.ACCESSORY,
      deletedAt: null,
      retiredAt: null,
      id: { not: query.primaryRentalItemId },
      accessoryLinksAsAccessory: {
        none: {
          tenantId: query.tenantId,
          primaryRentalItemId: query.primaryRentalItemId,
        },
      },
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [productTypes, total] = await Promise.all([
      this.prisma.client.productType.findMany({
        where,
        include: {
          category: true,
          billingUnit: {
            select: {
              id: true,
              label: true,
              durationMinutes: true,
            },
          },
          pricingTiers: {
            orderBy: [{ locationId: 'asc' }, { fromUnit: 'asc' }],
            select: {
              id: true,
              fromUnit: true,
              toUnit: true,
              pricePerUnit: true,
              locationId: true,
              location: {
                select: { id: true, name: true },
              },
            },
          },
          _count: {
            select: {
              assets: {
                where: { isActive: true, deletedAt: null },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.client.productType.count({ where }),
    ]);

    return ok({
      data: productTypes.map((pt) => ({
        id: pt.id,
        tenantId: pt.tenantId,
        name: pt.name,
        imageUrl: pt.imageUrl ?? '',
        description: pt.description,
        kind: pt.kind as RentalItemKind,
        trackingMode: pt.trackingMode as TrackingMode,
        excludeFromNewArrivals: pt.excludeFromNewArrivals,
        attributes: pt.attributes as Record<string, string>,
        includedItems: pt.includedItems as ProductTypeIncludedItemReadModel[],
        createdAt: pt.createdAt,
        updatedAt: pt.updatedAt,
        publishedAt: pt.publishedAt,
        retiredAt: pt.retiredAt,
        assetCount: pt._count.assets,
        category: pt.category
          ? {
              id: pt.category.id,
              name: pt.category.name,
              description: pt.category.description,
            }
          : null,
        billingUnit: {
          id: pt.billingUnit.id,
          label: pt.billingUnit.label,
          durationMinutes: pt.billingUnit.durationMinutes,
        },
        pricingTiers: pt.pricingTiers.map((tier) => ({
          id: tier.id,
          fromUnit: tier.fromUnit,
          toUnit: tier.toUnit,
          pricePerUnit: tier.pricePerUnit.toNumber(),
          locationId: tier.locationId,
          location: tier.location ? { id: tier.location.id, name: tier.location.name } : null,
        })),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
}
