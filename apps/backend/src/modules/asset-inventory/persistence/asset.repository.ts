import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import { Asset } from '../domain/asset.entity';
import { AssetMapper } from './asset.mapper';

type TransactionClient = Parameters<Parameters<PrismaService['client']['$transaction']>[0]>[0];

@Injectable()
export class AssetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadByIdForTenant(input: { tenantId: string; assetId: string }): Promise<Asset | null> {
    const record = await this.prisma.client.v2Asset.findFirst({
      where: { id: input.assetId, tenantId: input.tenantId, deletedAt: null },
    });

    return record ? AssetMapper.toDomain(record) : null;
  }

  async loadActiveBySerialNumberForTenant(input: {
    tenantId: string;
    serialNumber: string;
    excludeAssetId?: string;
  }): Promise<Asset | null> {
    const record = await this.prisma.client.v2Asset.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.excludeAssetId ? { not: input.excludeAssetId } : undefined,
        serialNumberNormalized: Asset.normalizeSerialNumberForComparison(input.serialNumber),
        deletedAt: null,
        status: { in: ['ACTIVE', 'INACTIVE'] },
      },
    });

    return record ? AssetMapper.toDomain(record) : null;
  }

  async loadActiveBySerialNumbersForTenant(input: { tenantId: string; serialNumbers: string[] }): Promise<Asset[]> {
    const normalizedSerialNumbers = new Set(input.serialNumbers.map(Asset.normalizeSerialNumberForComparison));

    const records = await this.prisma.client.v2Asset.findMany({
      where: {
        tenantId: input.tenantId,
        serialNumber: { not: null },
        deletedAt: null,
        status: { in: ['ACTIVE', 'INACTIVE'] },
      },
    });

    return records
      .filter((record) => {
        if (!record.serialNumber) {
          return false;
        }
        return normalizedSerialNumbers.has(Asset.normalizeSerialNumberForComparison(record.serialNumber));
      })
      .map(AssetMapper.toDomain);
  }

  async save(asset: Asset, tx?: TransactionClient): Promise<void> {
    const client = tx ?? this.prisma.client;
    await client.v2Asset.upsert({
      where: { id: asset.id },
      create: AssetMapper.toCreateData(asset),
      update: AssetMapper.toUpdateData(asset),
    });
  }

  async createMany(assets: Asset[], tx?: TransactionClient): Promise<void> {
    if (assets.length === 0) {
      return;
    }

    const client = tx ?? this.prisma.client;

    await client.v2Asset.createMany({
      data: assets.map(AssetMapper.toCreateData),
    });
  }
}
