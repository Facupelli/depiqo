import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import { RentableItemKind } from '../../domain/rentable-item.aggregate';

export interface RentalOfferReadModel {
  id: string;
  tenantId: string;
  branchId: string;
  rentableItemId: string;
  isVisible: boolean;
  isRentable: boolean;
}

export interface RentableItemReadModel {
  id: string;
  tenantId: string;
  name: string;
  kind: RentableItemKind;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  categoryId?: string | null;
}

export interface FulfillmentRequirementReadModel {
  rentableItemId: string;
  equipmentTypeId: string;
  quantityPerItem: number;
}

export interface EquipmentTypeReadModel {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
}

@Injectable()
export class PrismaResolveSelectedRentalOffersReader {
  constructor(private readonly prisma: PrismaService) {}

  async findRentalOffers(input: {
    tenantId: string;
    branchId: string;
    rentalOfferIds: string[];
  }): Promise<RentalOfferReadModel[]> {
    return this.prisma.client.v2RentalOffer.findMany({
      where: {
        id: { in: input.rentalOfferIds },
        tenantId: input.tenantId,
        branchId: input.branchId,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        rentableItemId: true,
        isVisible: true,
        isRentable: true,
      },
    });
  }

  async findRentableItems(input: { tenantId: string; rentableItemIds: string[] }): Promise<RentableItemReadModel[]> {
    return this.prisma.client.v2RentableItem.findMany({
      where: {
        id: { in: input.rentableItemIds },
        tenantId: input.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        kind: true,
        status: true,
        categoryId: true,
      },
    });
  }

  async findFulfillmentRequirements(input: {
    tenantId: string;
    rentableItemIds: string[];
  }): Promise<FulfillmentRequirementReadModel[]> {
    return this.prisma.client.v2RentableItemRequirement.findMany({
      where: {
        tenantId: input.tenantId,
        rentableItemId: { in: input.rentableItemIds },
      },
      select: {
        rentableItemId: true,
        equipmentTypeId: true,
        quantityPerItem: true,
      },
    });
  }

  async findEquipmentTypes(input: { tenantId: string; equipmentTypeIds: string[] }): Promise<EquipmentTypeReadModel[]> {
    return this.prisma.client.v2EquipmentType.findMany({
      where: {
        id: { in: input.equipmentTypeIds },
        tenantId: input.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        isActive: true,
      },
    });
  }
}
