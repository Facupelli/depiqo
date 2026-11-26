import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  AssetDisplayFact,
  AssetInventoryDisplayFacts,
  BranchAssetDisplayFactsPage,
  EquipmentTypeDisplayFact,
  GetAssetDisplayFactsInput,
  GetEquipmentTypeDisplayFactsInput,
  GetOwnerDisplayFactsInput,
  ListBranchAssetDisplayFactsInput,
  OwnerDisplayFact,
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

  async listBranchAssetDisplayFacts(input: ListBranchAssetDisplayFactsInput): Promise<BranchAssetDisplayFactsPage> {
    const { tenantId, branchId, equipmentTypeIds, assetIds, page, pageSize } = input;
    const selection = [
      ...(equipmentTypeIds?.length ? [{ equipmentTypeId: { in: [...equipmentTypeIds] } }] : []),
      ...(assetIds?.length ? [{ id: { in: [...assetIds] } }] : []),
    ];
    const where = { tenantId, branchId, equipmentType: { tenantId }, ...(selection.length ? { OR: selection } : {}) };
    const [assets, total] = await this.prisma.client.$transaction([
      this.prisma.client.v2Asset.findMany({
        where,
        select: {
          id: true,
          serialNumber: true,
          status: true,
          equipmentType: { select: { id: true, name: true } },
        },
        orderBy: [
          { equipmentType: { name: 'asc' } },
          { equipmentTypeId: 'asc' },
          { serialNumber: 'asc' },
          { id: 'asc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.client.v2Asset.count({ where }),
    ]);
    return {
      data: assets.map(({ id, serialNumber, status, equipmentType }) => ({
        assetId: id,
        serialNumber,
        status,
        equipmentType,
      })),
      total,
    };
  }

  async getOwnerDisplayFacts(input: GetOwnerDisplayFactsInput): Promise<OwnerDisplayFact[]> {
    const ownerIds = [...new Set(input.ownerIds)];
    if (ownerIds.length === 0) return [];

    const owners = await this.prisma.client.v2AssetOwner.findMany({
      where: {
        id: { in: ownerIds },
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    return owners.map((owner) => ({ ownerId: owner.id, name: owner.name }));
  }
}
