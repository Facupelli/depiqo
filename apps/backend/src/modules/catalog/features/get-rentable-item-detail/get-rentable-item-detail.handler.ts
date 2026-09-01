import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { ActivePhysicalStockFacts } from 'src/modules/asset-inventory/public-api/active-physical-stock-facts.public-api';

import { GetRentableItemDetailError, getRentableItemDetailError } from './get-rentable-item-detail.errors';
import { GetRentableItemDetailQuery } from './get-rentable-item-detail.query';
import { buildRentalOfferSetupSummary } from './rental-offer-setup-summary.policy';

export interface GetRentableItemDetailRequiredEquipmentReadModel {
  equipmentTypeId: string;
  equipmentTypeName: string | null;
  equipmentTypeDescription: string | null;
  quantityPerItem: number;
  notes: string | null;
}

export interface GetRentableItemDetailRatePlanTierReadModel {
  fromUnit: number;
  toUnit: number | null;
  pricePerUnit: string;
}

export interface GetRentableItemDetailActiveRatePlanReadModel {
  rentalOfferPricingId: string;
  ratePlanId: string;
  ratePlanName: string;
  currency: string;
  billingUnit: 'HOUR' | 'DAY' | 'WEEK';
  status: 'ACTIVE' | 'INACTIVE';
  tiers: GetRentableItemDetailRatePlanTierReadModel[];
}

export interface GetRentableItemDetailOfferReadModel {
  rentalOfferId: string;
  branchId: string;
  branchName: string | null;
  timezone: string | null;
  isVisible: boolean;
  isRentable: boolean;
  updatedAt: string;
  activeRatePlan: GetRentableItemDetailActiveRatePlanReadModel | null;
  setupSummary: import('@repo/api-contracts').GetRentableItemDetailOfferSetupSummaryDto;
  physicalStockCapacity: number;
}

export interface GetRentableItemDetailReadModel {
  id: string;
  name: string;
  description: string | null;
  kind: 'SINGLE' | 'PACKAGE' | 'KIT' | 'BUNDLE';
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  createdAt: string;
  updatedAt: string;
  requiredEquipment: GetRentableItemDetailRequiredEquipmentReadModel[];
  offers: GetRentableItemDetailOfferReadModel[];
}

@QueryHandler(GetRentableItemDetailQuery)
export class GetRentableItemDetailHandler implements IQueryHandler<
  GetRentableItemDetailQuery,
  Result<GetRentableItemDetailReadModel, GetRentableItemDetailError>
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activePhysicalStockFacts: ActivePhysicalStockFacts,
  ) {}

  async execute(
    query: GetRentableItemDetailQuery,
  ): Promise<Result<GetRentableItemDetailReadModel, GetRentableItemDetailError>> {
    const item = await this.prisma.client.v2RentableItem.findFirst({
      where: { id: query.rentableItemId, tenantId: query.tenantId },
      select: {
        id: true,
        name: true,
        description: true,
        kind: true,
        status: true,
        imageUrl: true,
        categoryId: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { name: true } },
        rentalOffers: {
          select: {
            id: true,
            branchId: true,
            isVisible: true,
            isRentable: true,
            updatedAt: true,
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
    });

    if (!item) {
      return err(
        getRentableItemDetailError(
          'catalog.rentable_item_not_found',
          `Rentable item "${query.rentableItemId}" was not found.`,
          undefined,
          {
            useCase: 'GetRentableItemDetail',
            tenantId: query.tenantId,
            rentableItemId: query.rentableItemId,
          },
        ),
      );
    }

    const branchIds = [...new Set(item.rentalOffers.map((offer) => offer.branchId))];
    const equipmentTypeIds = [...new Set(item.requirements.map((requirement) => requirement.equipmentTypeId))];
    const offerIds = item.rentalOffers.map((offer) => offer.id);

    // TODO: This read model currently composes cross-boundary data with Prisma direct reads.
    // Replace with module-owned read facades or a dedicated denormalized read model once Catalog,
    // Pricing, Tenant Management, and Asset Inventory public read APIs stabilize.
    const [branches, equipmentTypes, pricings] = await this.prisma.client.$transaction([
      this.prisma.client.v2Branch.findMany({
        where: { tenantId: query.tenantId, id: { in: branchIds } },
        select: { id: true, name: true, timezone: true, isActive: true },
      }),
      this.prisma.client.v2EquipmentType.findMany({
        where: { tenantId: query.tenantId, id: { in: equipmentTypeIds } },
        select: { id: true, name: true, description: true },
      }),
      this.prisma.client.v2RentalOfferPricing.findMany({
        where: {
          tenantId: query.tenantId,
          catalogRentalOfferId: { in: offerIds },
        },
        select: {
          id: true,
          catalogRentalOfferId: true,
          ratePlanId: true,
          isActive: true,
          ratePlan: {
            select: {
              name: true,
              currency: true,
              billingUnit: true,
              isActive: true,
              deletedAt: true,
              tiers: {
                select: { fromUnit: true, toUnit: true, pricePerUnit: true },
                orderBy: { fromUnit: 'asc' },
              },
            },
          },
        },
      }),
    ]);

    const activePhysicalStockCounts = await this.activePhysicalStockFacts.getActivePhysicalStockCounts({
      tenantId: query.tenantId,
      branches: item.rentalOffers.map((offer) => ({
        branchId: offer.branchId,
        equipmentTypeIds,
      })),
    });
    const activeAssetCountByBranchAndEquipmentType = new Map(
      activePhysicalStockCounts.map((count) => [`${count.branchId}:${count.equipmentTypeId}`, count.activeAssetCount]),
    );
    const branchById = new Map(branches.map((branch) => [branch.id, branch]));
    const equipmentTypeById = new Map(equipmentTypes.map((equipmentType) => [equipmentType.id, equipmentType]));
    const activePricingByOfferId = new Map(pricings.map((pricing) => [pricing.catalogRentalOfferId, pricing]));

    return ok({
      id: item.id,
      name: item.name,
      description: item.description,
      kind: item.kind,
      status: item.status,
      imageUrl: item.imageUrl,
      categoryId: item.categoryId,
      categoryName: item.category?.name ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      requiredEquipment: item.requirements.map((requirement) => {
        const equipmentType = equipmentTypeById.get(requirement.equipmentTypeId);

        return {
          equipmentTypeId: requirement.equipmentTypeId,
          equipmentTypeName: equipmentType?.name ?? null,
          equipmentTypeDescription: equipmentType?.description ?? null,
          quantityPerItem: requirement.quantityPerItem,
          notes: null,
        };
      }),
      offers: item.rentalOffers.map((offer) => {
        const branch = branchById.get(offer.branchId);
        const pricing = activePricingByOfferId.get(offer.id);
        const pricingForSetup = pricing
          ? {
              isActive: pricing.isActive,
              ratePlan: {
                id: pricing.ratePlanId,
                name: pricing.ratePlan.name,
                currency: pricing.ratePlan.currency,
                billingUnit: pricing.ratePlan.billingUnit,
                isActive: pricing.ratePlan.isActive && pricing.ratePlan.deletedAt === null,
                tiers: pricing.ratePlan.tiers.map((tier) => ({
                  pricePerUnit: tier.pricePerUnit.toString(),
                })),
              },
            }
          : null;
        const setupSummary = buildRentalOfferSetupSummary({
          itemStatus: item.status,
          branch: branch ? { isActive: branch.isActive } : null,
          offer,
          pricing: pricingForSetup,
        });
        const hasActivePricing =
          pricing !== undefined &&
          pricing.isActive &&
          pricing.ratePlan.isActive &&
          pricing.ratePlan.deletedAt === null &&
          pricing.ratePlan.tiers.length > 0;

        return {
          rentalOfferId: offer.id,
          branchId: offer.branchId,
          branchName: branch?.name ?? null,
          // This administrative setup read model exposes the branch override configuration, not an effective timezone.
          timezone: branch?.timezone ?? null,
          isVisible: offer.isVisible,
          isRentable: offer.isRentable,
          updatedAt: offer.updatedAt.toISOString(),
          activeRatePlan: hasActivePricing
            ? {
                rentalOfferPricingId: pricing.id,
                ratePlanId: pricing.ratePlanId,
                ratePlanName: pricing.ratePlan.name,
                currency: pricing.ratePlan.currency,
                billingUnit: pricing.ratePlan.billingUnit,
                status: pricing.ratePlan.isActive ? 'ACTIVE' : 'INACTIVE',
                tiers: pricing.ratePlan.tiers.map((tier) => ({
                  fromUnit: tier.fromUnit,
                  toUnit: tier.toUnit,
                  pricePerUnit: tier.pricePerUnit.toString(),
                })),
              }
            : null,
          setupSummary,
          physicalStockCapacity: getPhysicalStockCapacity({
            branchId: offer.branchId,
            requirements: item.requirements,
            activeAssetCountByBranchAndEquipmentType,
          }),
        };
      }),
    });
  }
}

function getPhysicalStockCapacity({
  branchId,
  requirements,
  activeAssetCountByBranchAndEquipmentType,
}: {
  branchId: string;
  requirements: Array<{ equipmentTypeId: string; quantityPerItem: number }>;
  activeAssetCountByBranchAndEquipmentType: Map<string, number>;
}): number {
  if (requirements.length === 0) return 0;

  return Math.min(
    ...requirements.map((requirement) =>
      Math.floor(
        (activeAssetCountByBranchAndEquipmentType.get(`${branchId}:${requirement.equipmentTypeId}`) ?? 0) /
          requirement.quantityPerItem,
      ),
    ),
  );
}
