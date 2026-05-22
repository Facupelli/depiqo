import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { Asset } from 'src/modules/inventory/domain/entities/asset.entity';
import { AssetAssignmentMapper, AssetMapper, RawAssetAssignment } from '../mappers/asset.mapper';
import { AssignmentType } from '@repo/types';

export class CannotDeleteOrderAssignmentException extends Error {
  constructor(assignmentId: string) {
    super(
      `Cannot delete asset assignment '${assignmentId}' because it is linked to an order. ` +
        `Order assignments must be removed through the order lifecycle.`,
    );
    this.name = 'CannotDeleteOrderAssignmentException';
  }
}

@Injectable()
export class AssetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async load(id: string, tenantId?: string): Promise<Asset | null> {
    const raw = await this.prisma.client.asset.findFirst({
      where: {
        id,
        ...(tenantId
          ? {
              location: {
                tenantId,
              },
            }
          : {}),
      },
    });

    if (!raw) {
      return null;
    }

    const assignments = await this.prisma.client.$queryRaw<RawAssetAssignment[]>`
        SELECT
          id, asset_id, order_item_id, order_item_accessory_id, order_id,
          type, stage, source, reason,
          period::text AS period,
          created_at, updated_at
      FROM asset_assignments
      WHERE asset_id = ${id}
    `;

    return AssetMapper.toDomain(raw, assignments);
  }

  async save(asset: Asset): Promise<string> {
    const rootData = AssetMapper.toPersistence(asset);
    const currentAssignments = asset.getAssignments();
    const currentAssignmentIds = new Set(currentAssignments.map((a) => a.id));

    await this.prisma.client.$transaction(async (tx) => {
      await tx.asset.upsert({
        where: { id: asset.id },
        create: rootData,
        update: rootData,
      });

      // 2. Fetch existing assignment ids and types from DB
      const existing = await tx.$queryRaw<{ id: string; type: string }[]>`
        SELECT id, type FROM asset_assignments WHERE asset_id = ${asset.id}
      `;
      const existingMap = new Map(existing.map((a) => [a.id, a.type]));

      // 3. Guard: never delete ORDER assignments
      const toDelete = [...existingMap.keys()].filter((id) => !currentAssignmentIds.has(id));
      for (const id of toDelete) {
        if (existingMap.get(id) === AssignmentType.ORDER) {
          throw new CannotDeleteOrderAssignmentException(id);
        }
      }

      // 4. Delete non-order assignments that are no longer in the aggregate
      for (const id of toDelete) {
        await tx.$executeRaw`
          DELETE FROM asset_assignments WHERE id = ${id}
        `;
      }

      // 5. Insert new assignments via executeRaw — required for ::tstzrange cast
      const toInsert = currentAssignments.filter((a) => !existingMap.has(a.id));
      for (const assignment of toInsert) {
        const sql = AssetAssignmentMapper.toPersistence(assignment);
        await tx.$executeRaw(sql);
      }
    });

    return asset.id;
  }
}
