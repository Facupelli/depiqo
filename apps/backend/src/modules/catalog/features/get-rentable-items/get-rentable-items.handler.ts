import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';

import { GetRentableItemsQuery } from './get-rentable-items.query';

export interface GetRentableItemsOfferReadModel {
  rentalOfferId: string;
  branchId: string;
  branchName: string | null;
  isVisible: boolean;
  isRentable: boolean;
}

export interface GetRentableItemsStartingPriceReadModel {
  amount: string;
  currency: string;
  billingUnit: 'HOUR' | 'DAY' | 'WEEK';
}

export interface GetRentableItemsRequiredEquipmentReadModel {
  equipmentTypeId: string;
  equipmentTypeName: string | null;
  quantityPerItem: number;
}

export interface GetRentableItemsItemReadModel {
  id: string;
  name: string;
  kind: 'SINGLE' | 'PACKAGE' | 'KIT' | 'BUNDLE';
  categoryId: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  imageUrl: string | null;
  offers: GetRentableItemsOfferReadModel[];
  startingPrice: GetRentableItemsStartingPriceReadModel | null;
  requiredEquipment: GetRentableItemsRequiredEquipmentReadModel[];
}

export interface GetRentableItemsResult {
  data: GetRentableItemsItemReadModel[];
  total: number;
  page: number;
  pageSize: number;
}

type RentalOfferFilter = {
  branchId?: string;
  isVisible?: boolean;
  isRentable?: boolean;
  id?: { in: string[] };
};

type StartingPriceCandidate = {
  amount: string;
  currency: string;
  billingUnit: 'HOUR' | 'DAY' | 'WEEK';
  numericAmount: number;
};

@QueryHandler(GetRentableItemsQuery)
export class GetRentableItemsHandler implements IQueryHandler<GetRentableItemsQuery, GetRentableItemsResult> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchFacts: BranchFacts,
  ) {}

  async execute(query: GetRentableItemsQuery): Promise<GetRentableItemsResult> {
    const activePricedOfferIds = await this.resolveActivePricedOfferIds(query);

    if (query.hasActivePricing === true && activePricedOfferIds.length === 0) {
      return { data: [], total: 0, page: query.page, pageSize: query.pageSize };
    }

    const offerFilter = this.buildOfferFilter(query, activePricedOfferIds);
    const where = {
      tenantId: query.tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...this.buildRentalOffersWhere(query, offerFilter, activePricedOfferIds),
    };

    const [items, total] = await this.prisma.client.$transaction([
      this.prisma.client.v2RentableItem.findMany({
        where,
        select: {
          id: true,
          name: true,
          kind: true,
          categoryId: true,
          status: true,
          imageUrl: true,
          rentalOffers: {
            where: offerFilter,
            select: {
              id: true,
              branchId: true,
              isVisible: true,
              isRentable: true,
            },
            orderBy: { createdAt: 'asc' },
          },
          requirements: {
            select: {
              equipmentTypeId: true,
              quantityPerItem: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.client.v2RentableItem.count({ where }),
    ]);

    const branchIds = [...new Set(items.flatMap((item) => item.rentalOffers.map((offer) => offer.branchId)))];
    const equipmentTypeIds = [
      ...new Set(items.flatMap((item) => item.requirements.map((requirement) => requirement.equipmentTypeId))),
    ];
    const offerIds = items.flatMap((item) => item.rentalOffers.map((offer) => offer.id));

    // TODO: This read model currently composes cross-boundary data with Prisma direct reads.
    // Replace with module-owned read facades or a dedicated denormalized read model once Catalog,
    // Pricing, Tenant Management, and Asset Inventory public read APIs stabilize.
    const [branchFactsResult, equipmentTypes, pricings] = await Promise.all([
      this.branchFacts.getBranchFactsBatch({ tenantId: query.tenantId, branchIds }),
      this.prisma.client.v2EquipmentType.findMany({
        where: { tenantId: query.tenantId, id: { in: equipmentTypeIds } },
        select: { id: true, name: true },
      }),
      this.prisma.client.v2RentalOfferPricing.findMany({
        where: {
          tenantId: query.tenantId,
          catalogRentalOfferId: { in: offerIds },
          isActive: true,
          ratePlan: { isActive: true },
        },
        select: {
          catalogRentalOfferId: true,
          ratePlan: {
            select: {
              currency: true,
              billingUnit: true,
              tiers: {
                select: { pricePerUnit: true },
                orderBy: { fromUnit: 'asc' },
              },
            },
          },
        },
      }),
    ]);

    if (branchFactsResult.isErr()) {
      throw new Error(branchFactsResult.error.message, { cause: branchFactsResult.error });
    }

    const branchNameById = new Map(branchFactsResult.value.map((branch) => [branch.branchId, branch.displayName]));
    const equipmentTypeNameById = new Map(
      equipmentTypes.map((equipmentType) => [equipmentType.id, equipmentType.name]),
    );
    const startingPriceByOfferId = new Map<string, StartingPriceCandidate>();

    for (const pricing of pricings) {
      for (const tier of pricing.ratePlan.tiers) {
        const amount = tier.pricePerUnit.toString();
        const candidate: StartingPriceCandidate = {
          amount,
          currency: pricing.ratePlan.currency,
          billingUnit: pricing.ratePlan.billingUnit,
          numericAmount: Number(amount),
        };
        const current = startingPriceByOfferId.get(pricing.catalogRentalOfferId);
        if (!current || candidate.numericAmount < current.numericAmount) {
          startingPriceByOfferId.set(pricing.catalogRentalOfferId, candidate);
        }
      }
    }

    return {
      data: items.map((item) => {
        const startingPrice = this.resolveStartingPrice(
          item.rentalOffers.map((offer) => offer.id),
          startingPriceByOfferId,
        );

        return {
          id: item.id,
          name: item.name,
          kind: item.kind,
          categoryId: item.categoryId,
          status: item.status,
          imageUrl: item.imageUrl,
          offers: item.rentalOffers.map((offer) => ({
            rentalOfferId: offer.id,
            branchId: offer.branchId,
            branchName: branchNameById.get(offer.branchId) ?? null,
            isVisible: offer.isVisible,
            isRentable: offer.isRentable,
          })),
          startingPrice,
          requiredEquipment: item.requirements.map((requirement) => ({
            equipmentTypeId: requirement.equipmentTypeId,
            equipmentTypeName: equipmentTypeNameById.get(requirement.equipmentTypeId) ?? null,
            quantityPerItem: requirement.quantityPerItem,
          })),
        };
      }),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  private async resolveActivePricedOfferIds(query: GetRentableItemsQuery): Promise<string[]> {
    if (query.hasActivePricing === undefined) {
      return [];
    }

    const activePricings = await this.prisma.client.v2RentalOfferPricing.findMany({
      where: {
        tenantId: query.tenantId,
        isActive: true,
        ratePlan: { isActive: true, tiers: { some: {} } },
      },
      select: { catalogRentalOfferId: true },
    });

    return activePricings.map((pricing) => pricing.catalogRentalOfferId);
  }

  private buildOfferFilter(query: GetRentableItemsQuery, activePricedOfferIds: string[]): RentalOfferFilter {
    return {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.isVisible === undefined ? {} : { isVisible: query.isVisible }),
      ...(query.isRentable === undefined ? {} : { isRentable: query.isRentable }),
      ...(query.hasActivePricing === true ? { id: { in: activePricedOfferIds } } : {}),
    };
  }

  private buildRentalOffersWhere(
    query: GetRentableItemsQuery,
    offerFilter: RentalOfferFilter,
    activePricedOfferIds: string[],
  ): Record<string, unknown> {
    if (query.hasActivePricing === false) {
      const baseOfferFilter = this.buildOfferFilter(query, []);
      if (activePricedOfferIds.length === 0) {
        return this.hasOfferFiltersExcludingPricing(query) ? { rentalOffers: { some: baseOfferFilter } } : {};
      }

      return {
        rentalOffers: {
          ...(this.hasOfferFiltersExcludingPricing(query) ? { some: baseOfferFilter } : {}),
          none: { ...baseOfferFilter, id: { in: activePricedOfferIds } },
        },
      };
    }

    if (!this.hasOfferFilters(query)) {
      return {};
    }

    return { rentalOffers: { some: offerFilter } };
  }

  private hasOfferFilters(query: GetRentableItemsQuery): boolean {
    return this.hasOfferFiltersExcludingPricing(query) || query.hasActivePricing === true;
  }

  private hasOfferFiltersExcludingPricing(query: GetRentableItemsQuery): boolean {
    return query.branchId !== undefined || query.isVisible !== undefined || query.isRentable !== undefined;
  }

  private resolveStartingPrice(
    offerIds: string[],
    startingPriceByOfferId: Map<string, StartingPriceCandidate>,
  ): GetRentableItemsStartingPriceReadModel | null {
    const startingPrice = offerIds.reduce<StartingPriceCandidate | null>((current, offerId) => {
      const candidate = startingPriceByOfferId.get(offerId);
      if (!candidate) {
        return current;
      }
      if (!current || candidate.numericAmount < current.numericAmount) {
        return candidate;
      }
      return current;
    }, null);

    if (!startingPrice) {
      return null;
    }

    return {
      amount: startingPrice.amount,
      currency: startingPrice.currency,
      billingUnit: startingPrice.billingUnit,
    };
  }
}
