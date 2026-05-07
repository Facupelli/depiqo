import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/core/database/prisma.service';
import { DEFAULT_RENTAL_PRODUCT_SORT, GetRentalProductTypesQuery } from './get-rental-product-types.query';
import { Prisma } from 'src/generated/prisma/client';
import {
  AvailableAssetCountReadModel,
  GetAvailableAssetCountsQuery,
} from 'src/modules/inventory/public/queries/get-available-asset-counts.query';
import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import {
  GetLocationContextQuery,
  LocationContextReadModel,
} from 'src/modules/tenant/public/queries/get-location-context.query';
import { RentalProductSort } from '@repo/schemas';

type RentalIncludedItemReadModel = {
  name: string;
  quantity: number;
  notes: string | null;
};

type RentalProductReadModel = {
  id: string;
  name: string;
  imageUrl: string;
  description: string | null;
  availableCount: number | null; // null when no period is selected
  category: { id: string; name: string } | null;
  attributes: Record<string, string>;
  includedItems: RentalIncludedItemReadModel[];
  billingUnit: { id: string; label: string };
  pricingTiers: Array<{
    id: string;
    fromUnit: number;
    toUnit: number | null;
    pricePerUnit: number;
  }>;
};

type PaginatedReadModel<T> = {
  data: T[];
  meta: {
    total: number;
    limit: number;
    page: number;
    totalPages: number;
  };
};

type RentalProductPageRow = {
  id: string;
};

type RentalProductCountRow = {
  total: bigint;
};

@QueryHandler(GetRentalProductTypesQuery)
export class GetRentalProductTypesQueryHandler implements IQueryHandler<
  GetRentalProductTypesQuery,
  PaginatedReadModel<RentalProductReadModel>
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(query: GetRentalProductTypesQuery): Promise<PaginatedReadModel<RentalProductReadModel>> {
    const { tenantId, locationId, pickupDate, returnDate, categoryId, search } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const sort = query.sort ?? DEFAULT_RENTAL_PRODUCT_SORT;

    const [pageRows, totalRows] = await Promise.all([
      this.selectPageProductIds({
        tenantId,
        locationId,
        categoryId,
        search,
        sort,
        limit,
        offset,
      }),
      this.countMatchingProducts({ tenantId, locationId, categoryId, search }),
    ]);

    const productIds = pageRows.map((row) => row.id);
    const total = Number(totalRows[0]?.total ?? 0n);

    if (productIds.length === 0) {
      return {
        data: [],
        meta: {
          total,
          limit,
          page,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    const rawProducts = await this.prisma.client.productType.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        description: true,
        includedItems: true,
        attributes: true,

        category: {
          select: { id: true, name: true },
        },

        billingUnit: {
          select: { id: true, label: true },
        },

        pricingTiers: {
          where: {
            OR: [{ locationId }, { locationId: null }],
          },
          select: {
            id: true,
            locationId: true,
            fromUnit: true,
            toUnit: true,
            pricePerUnit: true,
          },
          orderBy: [{ locationId: 'desc' }, { fromUnit: 'asc' }],
        },
      },
    });

    const availableCounts = await this.resolveAvailability(tenantId, locationId, pickupDate, returnDate, productIds);

    const rawProductsById = new Map(rawProducts.map((product) => [product.id, product]));

    const items: RentalProductReadModel[] = productIds.flatMap((productId) => {
      const product = rawProductsById.get(productId);

      if (!product) {
        return [];
      }

      const locationTiers = product.pricingTiers.filter((t) => t.locationId === locationId);
      const resolvedTiers =
        locationTiers.length > 0 ? locationTiers : product.pricingTiers.filter((t) => t.locationId === null);

      return [
        {
          id: product.id,
          name: product.name,
          // todo fix when image migration is not null
          imageUrl: product.imageUrl ?? '',
          description: product.description,
          availableCount: availableCounts?.get(product.id) ?? null,
          category: product.category ?? null,
          attributes: product.attributes as Record<string, string>,
          includedItems: product.includedItems as RentalIncludedItemReadModel[],
          billingUnit: product.billingUnit,
          pricingTiers: resolvedTiers.map((tier) => ({
            id: tier.id,
            fromUnit: tier.fromUnit,
            toUnit: tier.toUnit,
            // Prisma returns Decimal for Decimal fields — convert to JS number.
            pricePerUnit: tier.pricePerUnit.toNumber(),
          })),
        },
      ];
    });

    return {
      data: items,
      meta: {
        total,
        limit,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async selectPageProductIds({
    tenantId,
    locationId,
    categoryId,
    search,
    sort,
    limit,
    offset,
  }: {
    tenantId: string;
    locationId: string;
    categoryId?: string;
    search?: string;
    sort: RentalProductSort;
    limit: number;
    offset: number;
  }): Promise<RentalProductPageRow[]> {
    const { categoryFilter, searchFilter } = this.buildRawFilters({
      categoryId,
      search,
    });

    return this.prisma.client.$queryRaw<RentalProductPageRow[]>`
      WITH filtered_products AS (
        SELECT
          pt.id,
          pt.name,
          COALESCE(location_base.price_per_unit, global_base.price_per_unit) AS resolved_price
        FROM product_types pt
        LEFT JOIN LATERAL (
          SELECT price_per_unit
          FROM pricing_tiers pr
          WHERE pr.product_type_id = pt.id
            AND pr.location_id = ${locationId}
          ORDER BY pr.from_unit ASC
          LIMIT 1
        ) location_base ON TRUE
        LEFT JOIN LATERAL (
          SELECT price_per_unit
          FROM pricing_tiers pr
          WHERE pr.product_type_id = pt.id
            AND pr.location_id IS NULL
          ORDER BY pr.from_unit ASC
          LIMIT 1
        ) global_base ON TRUE
        WHERE pt.tenant_id = ${tenantId}
          AND pt.kind = 'PRIMARY'::"RentalItemKind"
          AND pt.retired_at IS NULL
          AND pt.published_at IS NOT NULL
          ${categoryFilter}
          ${searchFilter}
          AND EXISTS (
            SELECT 1
            FROM assets a
            WHERE a.product_type_id = pt.id
              AND a.location_id = ${locationId}
              AND a.is_active = true
              AND a.deleted_at IS NULL
          )
          AND COALESCE(location_base.price_per_unit, global_base.price_per_unit) IS NOT NULL
      )
      SELECT fp.id AS "id"
      FROM filtered_products fp
      ${this.buildOrderBy(sort)}
      LIMIT ${limit}
      OFFSET ${offset}
    `;
  }

  private async countMatchingProducts({
    tenantId,
    locationId,
    categoryId,
    search,
  }: {
    tenantId: string;
    locationId: string;
    categoryId?: string;
    search?: string;
  }): Promise<RentalProductCountRow[]> {
    const { categoryFilter, searchFilter } = this.buildRawFilters({
      categoryId,
      search,
    });

    return this.prisma.client.$queryRaw<RentalProductCountRow[]>`
      WITH filtered_products AS (
        SELECT pt.id
        FROM product_types pt
        LEFT JOIN LATERAL (
          SELECT price_per_unit
          FROM pricing_tiers pr
          WHERE pr.product_type_id = pt.id
            AND pr.location_id = ${locationId}
          ORDER BY pr.from_unit ASC
          LIMIT 1
        ) location_base ON TRUE
        LEFT JOIN LATERAL (
          SELECT price_per_unit
          FROM pricing_tiers pr
          WHERE pr.product_type_id = pt.id
            AND pr.location_id IS NULL
          ORDER BY pr.from_unit ASC
          LIMIT 1
        ) global_base ON TRUE
        WHERE pt.tenant_id = ${tenantId}
          AND pt.kind = 'PRIMARY'::"RentalItemKind"
          AND pt.retired_at IS NULL
          AND pt.published_at IS NOT NULL
          ${categoryFilter}
          ${searchFilter}
          AND EXISTS (
            SELECT 1
            FROM assets a
            WHERE a.product_type_id = pt.id
              AND a.location_id = ${locationId}
              AND a.is_active = true
              AND a.deleted_at IS NULL
          )
          AND COALESCE(location_base.price_per_unit, global_base.price_per_unit) IS NOT NULL
      )
      SELECT COUNT(*)::bigint AS "total"
      FROM filtered_products
    `;
  }

  private buildRawFilters({ categoryId, search }: { categoryId?: string; search?: string }) {
    const categoryFilter = categoryId ? Prisma.sql`AND pt.category_id = ${categoryId}` : Prisma.empty;
    const searchFilter = search ? Prisma.sql`AND pt.name ILIKE ${`%${search}%`}` : Prisma.empty;

    return { categoryFilter, searchFilter };
  }

  private buildOrderBy(sort: RentalProductSort): Prisma.Sql {
    switch (sort) {
      case 'price-asc':
        return Prisma.sql`ORDER BY fp.resolved_price ASC, fp.name ASC`;
      case 'alphabetical':
        return Prisma.sql`ORDER BY fp.name ASC`;
      case 'price-desc':
      default:
        return Prisma.sql`ORDER BY fp.resolved_price DESC, fp.name ASC`;
    }
  }

  private async resolveAvailability(
    tenantId: string,
    locationId: string,
    pickupDate: string | undefined,
    returnDate: string | undefined,
    productTypeIds: string[],
  ): Promise<Map<string, number> | null> {
    if (!pickupDate || !returnDate) return null;

    const locationContext = await this.queryBus.execute<GetLocationContextQuery, LocationContextReadModel | null>(
      new GetLocationContextQuery(tenantId, locationId),
    );

    if (!locationContext) {
      throw new Error(`Location context not found for location "${locationId}"`);
    }

    const period = DateRange.fromLocalDateKeys(pickupDate, returnDate, locationContext.effectiveTimezone);

    const rows = await this.queryBus.execute<GetAvailableAssetCountsQuery, AvailableAssetCountReadModel[]>(
      new GetAvailableAssetCountsQuery(locationId, period.start, period.end, productTypeIds),
    );

    return new Map(rows.map((row) => [row.productTypeId, row.availableCount]));
  }
}
