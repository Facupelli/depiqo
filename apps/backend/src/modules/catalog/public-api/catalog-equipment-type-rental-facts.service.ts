import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  CatalogEquipmentTypeRentalFact,
  CatalogEquipmentTypeRentalFacts,
  GetCatalogEquipmentTypeRentalFactsInput,
} from './catalog-equipment-type-rental-facts.public-api';

@Injectable()
export class CatalogEquipmentTypeRentalFactsService extends CatalogEquipmentTypeRentalFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getFacts(input: GetCatalogEquipmentTypeRentalFactsInput): Promise<CatalogEquipmentTypeRentalFact[]> {
    const equipmentTypeIds = [...new Set(input.equipmentTypeIds)];
    if (equipmentTypeIds.length === 0) return [];

    const requirements = await this.prisma.client.v2RentableItemRequirement.findMany({
      where: {
        tenantId: input.tenantId,
        equipmentTypeId: { in: equipmentTypeIds },
        rentableItem: {
          tenantId: input.tenantId,
          status: { in: ['DRAFT', 'ACTIVE'] },
          rentalOffers: {
            some: {
              tenantId: input.tenantId,
              ...(input.branchId ? { branchId: input.branchId } : {}),
            },
          },
        },
      },
      select: {
        equipmentTypeId: true,
        rentableItem: {
          select: {
            id: true,
            kind: true,
            rentalOffers: {
              where: {
                tenantId: input.tenantId,
                ...(input.branchId ? { branchId: input.branchId } : {}),
              },
              select: { id: true },
            },
          },
        },
      },
    });

    const standaloneIdsByEquipmentType = new Map<string, Set<string>>();
    const comboIdsByEquipmentType = new Map<string, Set<string>>();
    const offerIdsByEquipmentType = new Map<string, Set<string>>();

    for (const requirement of requirements) {
      if (requirement.rentableItem.kind === 'SINGLE') {
        const itemIds = standaloneIdsByEquipmentType.get(requirement.equipmentTypeId) ?? new Set<string>();
        itemIds.add(requirement.rentableItem.id);
        standaloneIdsByEquipmentType.set(requirement.equipmentTypeId, itemIds);

        const offerIds = offerIdsByEquipmentType.get(requirement.equipmentTypeId) ?? new Set<string>();
        for (const offer of requirement.rentableItem.rentalOffers) offerIds.add(offer.id);
        offerIdsByEquipmentType.set(requirement.equipmentTypeId, offerIds);
      } else if (requirement.rentableItem.kind === 'PACKAGE') {
        const itemIds = comboIdsByEquipmentType.get(requirement.equipmentTypeId) ?? new Set<string>();
        itemIds.add(requirement.rentableItem.id);
        comboIdsByEquipmentType.set(requirement.equipmentTypeId, itemIds);
      }
    }

    return equipmentTypeIds.map((equipmentTypeId) => ({
      equipmentTypeId,
      standaloneCount: standaloneIdsByEquipmentType.get(equipmentTypeId)?.size ?? 0,
      comboCount: comboIdsByEquipmentType.get(equipmentTypeId)?.size ?? 0,
      standaloneRentalOfferIds: [...(offerIdsByEquipmentType.get(equipmentTypeId) ?? [])],
    }));
  }
}
