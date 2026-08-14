import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  AssetDisplayFact,
  AssetInventoryDisplayFacts,
  EquipmentTypeDisplayFact,
  GetAssetDisplayFactsInput,
  GetEquipmentTypeDisplayFactsInput,
} from './asset-inventory-display-facts.public-api';

@Injectable()
export class AssetInventoryDisplayFactsService extends AssetInventoryDisplayFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getEquipmentTypeDisplayFacts(input: GetEquipmentTypeDisplayFactsInput): Promise<EquipmentTypeDisplayFact[]> {
    const equipmentTypeIds = [...new Set(input.equipmentTypeIds)];
    if (equipmentTypeIds.length === 0) return [];

    const equipmentTypes = await this.prisma.client.v2EquipmentType.findMany({
      where: {
        id: { in: equipmentTypeIds },
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        name: true,
        categoryId: true,
      },
    });

    return equipmentTypes.map((equipmentType) => ({
      equipmentTypeId: equipmentType.id,
      name: equipmentType.name,
      categoryId: equipmentType.categoryId,
    }));
  }

  async getAssetDisplayFacts(input: GetAssetDisplayFactsInput): Promise<AssetDisplayFact[]> {
    const assetIds = [...new Set(input.assetIds)];
    if (assetIds.length === 0) return [];

    const assets = await this.prisma.client.v2Asset.findMany({
      where: {
        id: { in: assetIds },
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        serialNumber: true,
      },
    });

    return assets.map((asset) => ({ assetId: asset.id, serialNumber: asset.serialNumber }));
  }
}
