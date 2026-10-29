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

  async loadByIdForTenantForUpdate(
    input: { tenantId: string; assetId: string },
    tx: TransactionClient,
  ): Promise<Asset | null> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM v2_assets
      WHERE id = ${input.assetId} AND tenant_id = ${input.tenantId}
      FOR UPDATE
    `;
    if (rows.length === 0) {
      return null;
    }

    return this.loadByIdForTenant(input, tx);
  }

  async save(asset: Asset, tx: TransactionClient): Promise<void> {
    await tx.v2Asset.update({
      where: { id: asset.id, tenantId: asset.tenantId },
      data: AssetMapper.toUpdateData(asset),
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
