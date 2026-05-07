import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { Promotion } from '../../domain/entities/promotion.entity';
import { PricingTier } from '../../domain/entities/pricing-tier.entity';
import { PromotionMapper } from '../persistence/mappers/promotion.mapper';
import { PricingTierMapper } from '../persistence/mappers/pricing-tier.mapper';
import { RentalItemKind } from '@repo/types';

export type ProductTypeMeta = {
  billingUnitDurationMinutes: number;
  categoryId: string | null;
};

export type BundleMeta = {
  billingUnitDurationMinutes: number;
};

export type ComponentTierData = {
  billingUnitDurationMinutes: number;
  tiers: PricingTier[];
};

@Injectable()
export class PricingComputationReadService {
  constructor(private readonly prisma: PrismaService) {}

  async loadProductTypeMetaBatch(productTypeIds: string[]): Promise<Map<string, ProductTypeMeta>> {
    const rows = await this.prisma.client.productType.findMany({
      where: { id: { in: productTypeIds }, kind: RentalItemKind.PRIMARY },
      select: {
        id: true,
        categoryId: true,
        billingUnit: { select: { durationMinutes: true } },
      },
    });

    return new Map(
      rows.map((row) => [
        row.id,
        {
          billingUnitDurationMinutes: row.billingUnit.durationMinutes,
          categoryId: row.categoryId,
        },
      ]),
    );
  }

  async loadBundleMetaBatch(bundleIds: string[]): Promise<Map<string, BundleMeta>> {
    const rows = await this.prisma.client.bundle.findMany({
      where: { id: { in: bundleIds } },
      select: {
        id: true,
        billingUnit: { select: { durationMinutes: true } },
      },
    });

    return new Map(
      rows.map((row) => [
        row.id,
        {
          billingUnitDurationMinutes: row.billingUnit.durationMinutes,
        },
      ]),
    );
  }

  async loadTiersForProducts(productTypeIds: string[], locationId: string): Promise<Map<string, PricingTier[]>> {
    const rows = await this.prisma.client.pricingTier.findMany({
      where: {
        productTypeId: { in: productTypeIds },
        productType: { kind: RentalItemKind.PRIMARY },
        OR: [{ locationId }, { locationId: null }],
      },
    });

    return this.groupResolvedTiersByKey(productTypeIds, rows, locationId, (row) => row.productTypeId);
  }

  async loadTiersForBundles(bundleIds: string[], locationId: string): Promise<Map<string, PricingTier[]>> {
    const rows = await this.prisma.client.pricingTier.findMany({
      where: {
        bundleId: { in: bundleIds },
        OR: [{ locationId }, { locationId: null }],
      },
    });

    return this.groupResolvedTiersByKey(bundleIds, rows, locationId, (row) => row.bundleId);
  }

  async loadTiersForBundleComponents(
    productTypeIds: string[],
    locationId: string,
  ): Promise<Map<string, ComponentTierData>> {
    const [tierRows, metaRows] = await Promise.all([
      this.prisma.client.pricingTier.findMany({
        where: {
          productTypeId: { in: productTypeIds },
          productType: { kind: RentalItemKind.PRIMARY },
          OR: [{ locationId }, { locationId: null }],
        },
      }),
      this.prisma.client.productType.findMany({
        where: { id: { in: productTypeIds }, kind: RentalItemKind.PRIMARY },
        select: {
          id: true,
          billingUnit: { select: { durationMinutes: true } },
        },
      }),
    ]);

    const metaByProductTypeId = new Map<string, number>(
      metaRows.map((row) => [row.id, row.billingUnit.durationMinutes]),
    );
    const result = new Map<string, ComponentTierData>();

    for (const productTypeId of productTypeIds) {
      const rawTiers = tierRows.filter((row) => row.productTypeId === productTypeId).map(PricingTierMapper.toDomain);

      result.set(productTypeId, {
        billingUnitDurationMinutes: metaByProductTypeId.get(productTypeId) ?? 60,
        tiers: this.resolveLocationTiers(rawTiers, locationId),
      });
    }

    return result;
  }

  async loadActivePromotionsForTenant(tenantId: string): Promise<Promotion[]> {
    const rows = await this.prisma.client.promotion.findMany({
      where: { tenantId, isActive: true },
      include: { exclusions: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    return rows.map(PromotionMapper.toDomain);
  }

  private resolveLocationTiers(tiers: PricingTier[], locationId: string): PricingTier[] {
    const byFromUnit = new Map<number, PricingTier>();

    for (const tier of tiers) {
      if (tier.locationId === null) {
        byFromUnit.set(tier.fromUnit, tier);
      }
    }

    for (const tier of tiers) {
      if (tier.locationId === locationId) {
        byFromUnit.set(tier.fromUnit, tier);
      }
    }

    return Array.from(byFromUnit.values()).sort((a, b) => a.fromUnit - b.fromUnit);
  }

  private groupResolvedTiersByKey(
    keys: string[],
    rows: any[],
    locationId: string,
    resolveKey: (row: any) => string | null,
  ): Map<string, PricingTier[]> {
    const tiers = rows.map(PricingTierMapper.toDomain);

    return new Map(
      keys.map((key) => [
        key,
        this.resolveLocationTiers(
          tiers.filter((_, index) => resolveKey(rows[index]) === key),
          locationId,
        ),
      ]),
    );
  }
}
