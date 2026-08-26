import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import { Asset } from '../domain/asset.entity';
import { AssetMapper } from './asset.mapper';

type TransactionClient = Parameters<Parameters<PrismaService['client']['$transaction']>[0]>[0];

@Injectable()
export class AssetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadByIdForTenant(input: { tenantId: string; assetId: string }, tx?: TransactionClient): Promise<Asset | null> {
    const client = tx ?? this.prisma.client;
    const record = await client.v2Asset.findFirst({
      where: { id: input.assetId, tenantId: input.tenantId },
    });

    return record ? AssetMapper.toDomain(record) : null;
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
