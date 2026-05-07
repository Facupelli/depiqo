import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/core/database/prisma.service';
import { GetProductTypeByIdQuery } from './get-product-type-by-id.query';
import { RentalItemKind, TrackingMode } from '@repo/types';

type ProductTypeIncludedItemReadModel = {
  name: string;
  quantity: number;
  notes: string | null;
};

type ProductTypeReadModel = {
  id: string;
  tenantId: string;
  name: string;
  imageUrl: string;
  description: string | null;
  kind: RentalItemKind;
  trackingMode: TrackingMode;
  excludeFromNewArrivals: boolean;
  attributes: Record<string, string>;
  includedItems: ProductTypeIncludedItemReadModel[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  retiredAt: Date | null;
  assetCount: number;
  category: { id: string; name: string; description: string | null } | null;
  billingUnit: { id: string; label: string; durationMinutes: number };
  pricingTiers: Array<{
    id: string;
    fromUnit: number;
    toUnit: number | null;
    pricePerUnit: number;
    locationId: string | null;
    location: { id: string; name: string } | null;
  }>;
  accessoryLinks: Array<{
    id: string;
    primaryRentalItemId: string;
    accessoryRentalItemId: string;
    isDefaultIncluded: boolean;
    defaultQuantity: number;
    notes: string | null;
    accessoryRentalItem: {
      id: string;
      name: string;
      imageUrl: string;
      trackingMode: TrackingMode;
      retiredAt: Date | null;
    };
  }>;
};

@QueryHandler(GetProductTypeByIdQuery)
export class GetProductTypeByIdQueryHandler implements IQueryHandler<
  GetProductTypeByIdQuery,
  ProductTypeReadModel | null
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetProductTypeByIdQuery): Promise<ProductTypeReadModel | null> {
    const productType = await this.prisma.client.productType.findFirst({
      where: { id: query.id, tenantId: query.tenantId },
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
          // Global tiers first, then location-specific; within each group by fromUnit.
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
        accessoryLinksAsPrimary: {
          where: {
            accessoryRentalItem: {
              kind: RentalItemKind.ACCESSORY,
              deletedAt: null,
              retiredAt: null,
            },
          },
          include: {
            accessoryRentalItem: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                trackingMode: true,
                retiredAt: true,
              },
            },
          },
          orderBy: { accessoryRentalItem: { name: 'asc' } },
        },
        _count: {
          select: {
            assets: {
              where: { isActive: true, deletedAt: null },
            },
          },
        },
      },
    });

    if (!productType) {
      return null;
    }

    return {
      id: productType.id,
      tenantId: productType.tenantId,
      name: productType.name,
      imageUrl: productType.imageUrl ?? '',
      description: productType.description,
      kind: productType.kind as RentalItemKind,
      trackingMode: productType.trackingMode as TrackingMode,
      excludeFromNewArrivals: productType.excludeFromNewArrivals,
      attributes: productType.attributes as Record<string, string>,
      includedItems: productType.includedItems as ProductTypeIncludedItemReadModel[],
      createdAt: productType.createdAt,
      updatedAt: productType.updatedAt,
      publishedAt: productType.publishedAt,
      retiredAt: productType.retiredAt,
      assetCount: productType._count.assets,
      category: productType.category
        ? {
            id: productType.category.id,
            name: productType.category.name,
            description: productType.category.description,
          }
        : null,
      billingUnit: {
        id: productType.billingUnit.id,
        label: productType.billingUnit.label,
        durationMinutes: productType.billingUnit.durationMinutes,
      },
      pricingTiers: productType.pricingTiers.map((tier) => ({
        id: tier.id,
        fromUnit: tier.fromUnit,
        toUnit: tier.toUnit,
        pricePerUnit: tier.pricePerUnit.toNumber(),
        locationId: tier.locationId,
        location: tier.location ? { id: tier.location.id, name: tier.location.name } : null,
      })),
      accessoryLinks: productType.accessoryLinksAsPrimary.map((accessoryLink) => ({
        id: accessoryLink.id,
        primaryRentalItemId: accessoryLink.primaryRentalItemId,
        accessoryRentalItemId: accessoryLink.accessoryRentalItemId,
        isDefaultIncluded: accessoryLink.isDefaultIncluded,
        defaultQuantity: accessoryLink.defaultQuantity,
        notes: accessoryLink.notes,
        accessoryRentalItem: {
          id: accessoryLink.accessoryRentalItem.id,
          name: accessoryLink.accessoryRentalItem.name,
          imageUrl: accessoryLink.accessoryRentalItem.imageUrl ?? '',
          trackingMode: accessoryLink.accessoryRentalItem.trackingMode as TrackingMode,
          retiredAt: accessoryLink.accessoryRentalItem.retiredAt,
        },
      })),
    };
  }
}
