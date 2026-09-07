import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  CatalogEquipmentTypeRentalUsages,
  CatalogEquipmentTypeRentalUsagesResult,
  GetCatalogEquipmentTypeRentalUsagesInput,
} from './catalog-equipment-type-rental-usages.public-api';

@Injectable()
export class CatalogEquipmentTypeRentalUsagesService extends CatalogEquipmentTypeRentalUsages {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getUsages(input: GetCatalogEquipmentTypeRentalUsagesInput): Promise<CatalogEquipmentTypeRentalUsagesResult[]> {
    const equipmentTypeIds = [...new Set(input.equipmentTypeIds)];
    if (equipmentTypeIds.length === 0) return [];

    const requirements = await this.prisma.client.v2RentableItemRequirement.findMany({
      where: {
        tenantId: input.tenantId,
        equipmentTypeId: { in: equipmentTypeIds },
        rentableItem: { tenantId: input.tenantId },
      },
      select: {
        equipmentTypeId: true,
        quantityPerItem: true,
        rentableItem: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            categoryId: true,
            kind: true,
            status: true,
            rentalOffers: {
              where: { tenantId: input.tenantId },
              select: {
                id: true,
                branchId: true,
                isVisible: true,
                isRentable: true,
              },
            },
          },
        },
      },
    });

    const usagesByEquipmentTypeId = new Map<string, CatalogEquipmentTypeRentalUsagesResult['usages']>();
    for (const requirement of requirements) {
      const usages = usagesByEquipmentTypeId.get(requirement.equipmentTypeId) ?? [];
      usages.push({
        rentableItemId: requirement.rentableItem.id,
        name: requirement.rentableItem.name,
        imageUrl: requirement.rentableItem.imageUrl,
        categoryId: requirement.rentableItem.categoryId,
        kind: requirement.rentableItem.kind,
        status: requirement.rentableItem.status,
        requirementQuantity: requirement.quantityPerItem,
        offers: requirement.rentableItem.rentalOffers.map((offer) => ({
          rentalOfferId: offer.id,
          branchId: offer.branchId,
          isVisible: offer.isVisible,
          isRentable: offer.isRentable,
        })),
      });
      usagesByEquipmentTypeId.set(requirement.equipmentTypeId, usages);
    }

    return equipmentTypeIds.map((equipmentTypeId) => ({
      equipmentTypeId,
      usages: usagesByEquipmentTypeId.get(equipmentTypeId) ?? [],
    }));
  }
}
