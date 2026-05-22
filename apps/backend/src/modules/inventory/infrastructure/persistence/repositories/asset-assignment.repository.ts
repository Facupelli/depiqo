import { Injectable } from '@nestjs/common';
import { AssignmentType, OrderAssignmentStage } from '@repo/types';
import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';
import { mapPostgresError } from 'src/core/utils/postgres-error.mapper';
import { formatPostgresRange } from 'src/core/utils/postgres-range.util';
import { AssetAssignment } from 'src/modules/inventory/domain/entities/asset-assignment.entity';

@Injectable()
export class AssetAssignmentRepository {
  /**
   * Persists a new AssetAssignment via raw SQL.
   *
   * tstzrange is unsupported by Prisma's type system — this insert must
   * be raw. The EXCLUDE constraint fires here if a concurrent request
   * already claimed this asset for an overlapping period.
   */
  async save(assignment: AssetAssignment, tx: PrismaTransactionClient): Promise<void> {
    const period = formatPostgresRange(assignment.period);

    try {
      await tx.$executeRaw`
        INSERT INTO asset_assignments (
          id,
          asset_id,
          order_item_id,
          order_item_accessory_id,
          order_id,
          type,
          stage,
          source,
          reason,
          period,
          created_at,
          updated_at
        ) VALUES (
          ${assignment.id}::uuid,
          ${assignment.assetId}::uuid,
          ${assignment.orderItemId}::uuid,
          ${assignment.orderItemAccessoryId}::uuid,
          ${assignment.orderId}::uuid,
          ${assignment.type}::"AssignmentType",
          ${assignment.stage}::"OrderAssignmentStage",
          ${assignment.source}::"AssignmentSource",
          ${assignment.reason},
          ${period}::tstzrange,
          now(),
          now()
        )
      `;
    } catch (error) {
      mapPostgresError(error);
    }
  }

  async transitionOrderAssignmentsStage(
    orderId: string,
    fromStage: OrderAssignmentStage,
    toStage: OrderAssignmentStage,
    tx: PrismaTransactionClient,
  ): Promise<void> {
    await tx.assetAssignment.updateMany({
      where: {
        orderId,
        type: AssignmentType.ORDER,
        stage: fromStage,
      },
      data: {
        stage: toStage,
      },
    });
  }

  async releaseOrderAssignments(
    orderId: string,
    stage: OrderAssignmentStage,
    tx: PrismaTransactionClient,
  ): Promise<void> {
    await tx.assetAssignment.deleteMany({
      where: {
        orderId,
        type: AssignmentType.ORDER,
        stage,
      },
    });
  }

  async releaseOrderItemAccessoryAssignments(
    orderItemAccessoryId: string,
    tx: PrismaTransactionClient,
    options?: { keepCount?: number },
  ): Promise<void> {
    if (options?.keepCount == null) {
      await tx.assetAssignment.deleteMany({
        where: {
          orderItemAccessoryId,
          type: AssignmentType.ORDER,
        },
      });
      return;
    }

    const assignments = await tx.assetAssignment.findMany({
      where: {
        orderItemAccessoryId,
        type: AssignmentType.ORDER,
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    const releaseIds = assignments.slice(Math.max(options.keepCount, 0)).map((assignment) => assignment.id);
    if (releaseIds.length === 0) {
      return;
    }

    await tx.assetAssignment.deleteMany({
      where: { id: { in: releaseIds } },
    });
  }
}
