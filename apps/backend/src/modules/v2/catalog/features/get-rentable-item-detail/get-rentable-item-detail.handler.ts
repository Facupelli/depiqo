import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  GetRentableItemDetailApplicationError,
  getRentableItemDetailApplicationError,
} from './get-rentable-item-detail-application.error';
import { GetRentableItemDetailQuery } from './get-rentable-item-detail.query';

export interface GetRentableItemDetailRequiredEquipmentReadModel {
  equipmentTypeId: string;
  equipmentTypeName: string | null;
  equipmentTypeDescription: string | null;
  quantityPerItem: number;
  notes: string | null;
  isActive: boolean | null;
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
  supportsDelivery: boolean | null;
  isVisible: boolean;
  isRentable: boolean;
  updatedAt: string;
  activeRatePlan: GetRentableItemDetailActiveRatePlanReadModel | null;
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
  Result<GetRentableItemDetailReadModel, GetRentableItemDetailApplicationError>
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetRentableItemDetailQuery,
  ): Promise<Result<GetRentableItemDetailReadModel, GetRentableItemDetailApplicationError>> {
    const item = await this.prisma.client.v2RentableItem.findFirst({
      where: { id: query.rentableItemId, tenantId: query.tenantId, deletedAt: null },
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
          where: { deletedAt: null },
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
        getRentableItemDetailApplicationError(
          'RentableItemNotFound',
          'The requested rentable item could not be found.',
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
        where: { tenantId: query.tenantId, id: { in: branchIds }, deletedAt: null },
        select: { id: true, name: true, timezone: true, supportsDelivery: true },
      }),
      this.prisma.client.v2EquipmentType.findMany({
        where: { tenantId: query.tenantId, id: { in: equipmentTypeIds }, deletedAt: null },
        select: { id: true, name: true, description: true, isActive: true },
      }),
      this.prisma.client.v2RentalOfferPricing.findMany({
        where: {
          tenantId: query.tenantId,
          catalogRentalOfferId: { in: offerIds },
          isActive: true,
          deletedAt: null,
          ratePlan: { isActive: true, deletedAt: null },
        },
        select: {
          id: true,
          catalogRentalOfferId: true,
          ratePlanId: true,
          ratePlan: {
            select: {
              name: true,
              currency: true,
              billingUnit: true,
              isActive: true,
              tiers: {
                select: { fromUnit: true, toUnit: true, pricePerUnit: true },
                orderBy: { fromUnit: 'asc' },
              },
            },
          },
        },
      }),
    ]);

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
          isActive: equipmentType?.isActive ?? null,
        };
      }),
      offers: item.rentalOffers.map((offer) => {
        const branch = branchById.get(offer.branchId);
        const pricing = activePricingByOfferId.get(offer.id);

        return {
          rentalOfferId: offer.id,
          branchId: offer.branchId,
          branchName: branch?.name ?? null,
          timezone: branch?.timezone ?? null,
          supportsDelivery: branch?.supportsDelivery ?? null,
          isVisible: offer.isVisible,
          isRentable: offer.isRentable,
          updatedAt: offer.updatedAt.toISOString(),
          activeRatePlan: pricing
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
        };
      }),
    });
  }
}
