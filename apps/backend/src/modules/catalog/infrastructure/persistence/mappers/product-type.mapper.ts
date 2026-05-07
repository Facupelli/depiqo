import {
  ProductType as PrismaProductType,
  PricingTier as PrismaPricingTier,
  Prisma,
} from 'src/generated/prisma/client';
import { ProductType } from 'src/modules/catalog/domain/entities/product-type.entity';
import { RentalItemKind, TrackingMode } from '@repo/types';
import { InputJsonValue } from '@prisma/client/runtime/client';

type PrismaProductTypeWithRelations = PrismaProductType & {
  pricingTiers: PrismaPricingTier[];
};

export class ProductTypeMapper {
  static toDomain(raw: PrismaProductTypeWithRelations): ProductType {
    return ProductType.reconstitute({
      id: raw.id,
      tenantId: raw.tenantId,
      categoryId: raw.categoryId,
      billingUnitId: raw.billingUnitId,
      name: raw.name,
      imageUrl: raw.imageUrl ?? '',
      description: raw.description,
      kind: raw.kind as RentalItemKind,
      trackingMode: raw.trackingMode as TrackingMode,
      excludeFromNewArrivals: raw.excludeFromNewArrivals,
      attributes: raw.attributes as Record<string, unknown>,
      includedItems: raw.includedItems as unknown[],
      hasPricingTiersConfigured: raw.pricingTiers.length > 0,
      publishedAt: raw.publishedAt,
      retiredAt: raw.retiredAt,
    });
  }

  static toPersistence(entity: ProductType): Prisma.ProductTypeUncheckedCreateInput {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      categoryId: entity.currentCategoryId,
      billingUnitId: entity.currentBillingUnitId,
      name: entity.currentName,
      imageUrl: entity.currentImageUrl,
      description: entity.currentDescription,
      kind: entity.currentKind,
      trackingMode: entity.currentTrackingMode,
      excludeFromNewArrivals: entity.isExcludedFromNewArrivals,
      attributes: entity.currentAttributes as InputJsonValue,
      includedItems: entity.currentIncludedItems as InputJsonValue,
      publishedAt: entity.getPublishedAt(),
      retiredAt: entity.getRetiredAt(),
    };
  }
}
