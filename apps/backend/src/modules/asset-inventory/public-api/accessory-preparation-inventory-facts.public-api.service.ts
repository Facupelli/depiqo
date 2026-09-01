import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  AccessoryPreparationInventoryFacts,
  AccessoryPreparationInventoryFactsResult,
  GetAccessoryPreparationInventoryFactsInput,
} from './accessory-preparation-inventory-facts.public-api';

@Injectable()
export class AccessoryPreparationInventoryFactsService extends AccessoryPreparationInventoryFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getAccessoryPreparationInventoryFacts(
    input: GetAccessoryPreparationInventoryFactsInput,
  ): Promise<AccessoryPreparationInventoryFactsResult> {
    const sourceEquipmentTypeIds = [...new Set(input.sourceEquipmentTypeIds)];
    if (sourceEquipmentTypeIds.length === 0) return { defaults: [], eligibleAssets: [] };

    const defaults = await this.prisma.client.v2EquipmentTypeAccessoryDefault.findMany({
      where: {
        tenantId: input.tenantId,
        equipmentTypeId: { in: sourceEquipmentTypeIds },
      },
      select: {
        equipmentTypeId: true,
        accessoryEquipmentTypeId: true,
        quantity: true,
        accessoryEquipmentType: { select: { name: true } },
      },
      orderBy: [{ equipmentTypeId: 'asc' }, { accessoryEquipmentType: { name: 'asc' } }],
    });
    const accessoryEquipmentTypeIds = [...new Set(defaults.map((item) => item.accessoryEquipmentTypeId))];
    if (accessoryEquipmentTypeIds.length === 0) return { defaults: [], eligibleAssets: [] };

    const assets = await this.prisma.client.v2Asset.findMany({
      where: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        equipmentTypeId: { in: accessoryEquipmentTypeIds },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        equipmentTypeId: true,
        ownerId: true,
        owner: {
          select: {
            contracts: {
              where: {
                assetId: null,
                validFrom: { lte: input.operationTime },
                OR: [{ validTo: null }, { validTo: { gt: input.operationTime } }],
              },
              select: { id: true },
            },
          },
        },
      },
    });

    return {
      defaults: defaults.map((item) => ({
        sourceEquipmentTypeId: item.equipmentTypeId,
        accessoryEquipmentTypeId: item.accessoryEquipmentTypeId,
        accessoryEquipmentTypeName: item.accessoryEquipmentType.name,
        quantityPerUnit: item.quantity,
      })),
      eligibleAssets: assets
        .filter((asset) => asset.ownerId === null || asset.owner?.contracts.length === 1)
        .map((asset) => ({ assetId: asset.id, equipmentTypeId: asset.equipmentTypeId })),
    };
  }
}
