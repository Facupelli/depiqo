import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import { Asset } from '../domain/asset.entity';
import { AssetMapper } from './asset.mapper';

type TransactionClient = Parameters<Parameters<PrismaService['client']['$transaction']>[0]>[0];

@Injectable()
export class AssetRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  async save(assets: Asset[], tx?: TransactionClient): Promise<void> {
    if (assets.length === 0) {
      return;
    }

    const client = tx ?? this.prisma.client;

    await client.v2Asset.createMany({
      data: assets.map(AssetMapper.toCreateData),
    });
  }
}
