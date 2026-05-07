import { AssignmentSource, AssignmentType, OrderAssignmentStage } from '@repo/types';
import { formatPostgresRange, parsePostgresRange } from 'src/core/utils/postgres-range.util';
import { Prisma, Asset as PrismaAsset } from 'src/generated/prisma/client';
import { AssetAssignment } from 'src/modules/inventory/domain/entities/asset-assignment.entity';
import { Asset } from 'src/modules/inventory/domain/entities/asset.entity';
import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';

// Prisma does not generate types for Unsupported("tstzrange") fields.
// This type mirrors the raw DB row shape returned by queryRaw for asset_assignments.
export type RawAssetAssignment = {
  id: string;
  asset_id: string;
  order_item_id: string | null;
  order_item_accessory_id: string | null;
  order_id: string | null;
  type: string;
  stage: string | null;
  source: string | null;
  reason: string | null;
  period: string; // raw tstzrange string from Postgres — cast via period::text in queryRaw
  created_at: Date;
  updated_at: Date;
};

export class AssetAssignmentMapper {
  static toDomain(raw: RawAssetAssignment): AssetAssignment {
    const { start, end } = parsePostgresRange(raw.period);
    const period = DateRange.create(start, end);

    return AssetAssignment.reconstitute({
      id: raw.id,
      assetId: raw.asset_id,
      period,
      type: raw.type as AssignmentType,
      stage: raw.stage as OrderAssignmentStage | null,
      source: raw.source as AssignmentSource | null,
      orderItemId: raw.order_item_id,
      orderItemAccessoryId: raw.order_item_accessory_id,
      orderId: raw.order_id,
      reason: raw.reason,
    });
  }

  static toPersistence(entity: AssetAssignment): Prisma.Sql {
    const period = formatPostgresRange(entity.period);
    return Prisma.sql`
      INSERT INTO asset_assignments
        (id, asset_id, order_item_id, order_item_accessory_id, order_id, type, stage, source, reason, period)
      VALUES
        (${entity.id}, ${entity.assetId}, ${entity.orderItemId}, ${entity.orderItemAccessoryId}, ${entity.orderId},
         ${entity.type}::"AssignmentType", ${entity.stage}::"OrderAssignmentStage", ${entity.source}::"AssignmentSource",
         ${entity.reason}, ${period}::tstzrange)
    `;
  }
}

export class AssetMapper {
  static toDomain(raw: PrismaAsset, assignments: RawAssetAssignment[]): Asset {
    return Asset.reconstitute({
      id: raw.id,
      locationId: raw.locationId,
      productTypeId: raw.productTypeId,
      ownerId: raw.ownerId,
      serialNumber: raw.serialNumber,
      notes: raw.notes,
      isActive: raw.isActive,
      deletedAt: raw.deletedAt,
      assignments: assignments.map(AssetAssignmentMapper.toDomain),
    });
  }

  static toPersistence(entity: Asset): Prisma.AssetUncheckedCreateInput {
    return {
      id: entity.id,
      locationId: entity.locationId,
      productTypeId: entity.productTypeId,
      ownerId: entity.ownerId,
      serialNumber: entity.serialNumber,
      notes: entity.notes,
      isActive: entity.active,
      deletedAt: entity.deletedOn,
    };
  }
}
