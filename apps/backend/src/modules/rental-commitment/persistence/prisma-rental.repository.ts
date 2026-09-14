import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';
import { mapPostgresError } from 'src/core/utils/postgres-error.mapper';

import { Rental } from '../domain/rental.aggregate';
import { AssetBlockType, RentalStatus } from '../domain/rental-status';
import {
  RentalPersistenceStateMismatchError,
  RentalRepository,
  ReplaceDraftRentalOptions,
  RescheduleConfirmedRentalOptions,
  SaveRentalOptions,
  SaveRentalResult,
  UnsafeDraftRentalReplacementError,
} from './rental.repository';
import { AssetBlockPersistenceRecord, RentalMapper } from './rental.mapper';

@Injectable()
export class PrismaRentalRepository extends RentalRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(tenantId: string, rentalId: string, tx?: PrismaTransactionClient): Promise<Rental | null> {
    const db = tx ?? this.prisma.client;
    const rental = await db.v2Rental.findFirst({
      where: { id: rentalId, tenantId },
      include: {
        selections: true,
        demandLines: true,
        assignedAssets: true,
        deliveryDetails: true,
      },
    });

    if (!rental) {
      return null;
    }

    const assetBlocks = await this.findAssetBlocks({ tenantId, rentalId }, db);

    return RentalMapper.toDomain({
      ...rental,
      assetBlocks,
    });
  }

  async save(rental: Rental, options?: SaveRentalOptions): Promise<SaveRentalResult | null> {
    try {
      if (options?.tx) {
        return await this.persistRental(options.tx, rental, options);
      }

      return await this.prisma.client.$transaction((tx) => this.persistRental(tx, rental, options));
    } catch (error) {
      mapPostgresError(error);
    }
  }

  async rescheduleConfirmedPeriod(
    rental: Rental,
    options: RescheduleConfirmedRentalOptions,
  ): Promise<SaveRentalResult | null> {
    try {
      const claimed = await options.tx.v2Rental.updateMany({
        where: {
          id: rental.id,
          tenantId: rental.tenantId,
          status: 'CONFIRMED',
          version: options.expectedVersion,
        },
        data: {
          ...RentalMapper.toConfirmedPeriodRescheduleUpdateData(rental),
          version: { increment: 1 },
        },
      });
      if (claimed.count === 0) return null;

      for (const assignment of rental.currentAssignedAssets) {
        const updated = await options.tx.v2AssignedAsset.updateMany({
          where: {
            id: assignment.id,
            tenantId: rental.tenantId,
            rentalId: rental.id,
            rentalDemandLineId: assignment.rentalDemandLineId,
            assetId: assignment.assetId,
            effectiveUntil: null,
          },
          data: { effectiveFrom: assignment.effectiveFrom },
        });
        if (updated.count !== 1) {
          throw new RentalPersistenceStateMismatchError(rental.id, 'assignment', assignment.id);
        }
      }

      const currentEquipmentAssetIds = new Set(rental.currentAssignedAssets.map((assignment) => assignment.assetId));
      const currentBlocks = rental.assetBlocks.filter(
        (block) =>
          block.isActive &&
          (block.blockType === AssetBlockType.Accessory ||
            (block.blockType === AssetBlockType.Equipment && currentEquipmentAssetIds.has(block.assetId))),
      );
      for (const block of currentBlocks) {
        const updated = await options.tx.$executeRaw`
          UPDATE v2_asset_blocks
          SET period = ${block.period.toPostgresRange()}::tstzrange
          WHERE id = ${block.id}
            AND tenant_id = ${rental.tenantId}
            AND rental_id = ${rental.id}
            AND asset_id = ${block.assetId}
            AND block_type = ${block.blockType}::"V2AssetBlockType"
            AND released_at IS NULL
        `;
        if (updated !== 1) {
          throw new RentalPersistenceStateMismatchError(rental.id, 'asset block', block.id);
        }
      }

      return options.tx.v2Rental.findUniqueOrThrow({
        where: { id: rental.id },
        select: { version: true, updatedAt: true },
      });
    } catch (error) {
      mapPostgresError(error);
    }
  }

  async replaceDraft(rental: Rental, options: ReplaceDraftRentalOptions): Promise<SaveRentalResult | null> {
    if (rental.status !== RentalStatus.Draft) {
      throw new UnsafeDraftRentalReplacementError(rental.id, [`rental status ${rental.status}`]);
    }

    try {
      if (options.tx) {
        return await this.persistDraftReplacement(options.tx, rental, options.expectedVersion);
      }

      return await this.prisma.client.$transaction((tx) =>
        this.persistDraftReplacement(tx, rental, options.expectedVersion),
      );
    } catch (error) {
      mapPostgresError(error);
    }
  }

  private async persistDraftReplacement(
    tx: PrismaTransactionClient,
    rental: Rental,
    expectedVersion: number,
  ): Promise<SaveRentalResult | null> {
    const claimed = await tx.v2Rental.updateMany({
      where: {
        id: rental.id,
        tenantId: rental.tenantId,
        status: 'DRAFT',
        version: expectedVersion,
      },
      data: { version: { increment: 1 } },
    });
    if (claimed.count === 0) return null;

    const rentalWhere = { tenantId: rental.tenantId, rentalId: rental.id };
    const orderWhere = { tenantId: rental.tenantId, rentalOrderId: rental.id };
    const [assignedAssets, assetBlocks, accessorySelections, accessoryAssignments, ownerSplits] = await Promise.all([
      tx.v2AssignedAsset.count({ where: rentalWhere }),
      tx.v2AssetBlock.count({ where: rentalWhere }),
      tx.v2RentalAccessorySelection.count({ where: orderWhere }),
      tx.v2RentalAccessoryAssetAssignment.count({ where: orderWhere }),
      tx.v2RentalOwnerSplit.count({ where: rentalWhere }),
    ]);
    const forbiddenState = [
      assignedAssets > 0 ? 'assigned assets' : undefined,
      assetBlocks > 0 ? 'asset blocks' : undefined,
      accessorySelections > 0 ? 'accessory selections' : undefined,
      accessoryAssignments > 0 ? 'accessory assignments' : undefined,
      ownerSplits > 0 ? 'owner splits' : undefined,
    ].filter((value): value is string => value !== undefined);
    if (forbiddenState.length > 0) {
      throw new UnsafeDraftRentalReplacementError(rental.id, forbiddenState);
    }

    await tx.v2RentalDemandLine.deleteMany({ where: rentalWhere });
    await tx.v2RentalSelection.deleteMany({ where: rentalWhere });

    if (rental.selections.length > 0) {
      await tx.v2RentalSelection.createMany({
        data: rental.selections.map(RentalMapper.toSelectionCreateData),
      });
    }
    if (rental.demandLines.length > 0) {
      await tx.v2RentalDemandLine.createMany({
        data: rental.demandLines.map(RentalMapper.toDemandLineCreateData),
      });
    }

    await tx.v2RentalDeliveryDetails.deleteMany({ where: orderWhere });
    const deliveryDetails = RentalMapper.toDeliveryDetailsCreateData(rental);
    if (deliveryDetails) {
      await tx.v2RentalDeliveryDetails.create({ data: deliveryDetails });
    }

    return tx.v2Rental.update({
      where: { id: rental.id },
      data: RentalMapper.toDraftProposalUpdateData(rental),
      select: { version: true, updatedAt: true },
    });
  }

  private async persistRental(
    tx: PrismaTransactionClient,
    rental: Rental,
    options?: Omit<SaveRentalOptions, 'tx'>,
  ): Promise<SaveRentalResult | null> {
    const rentalWhere = {
      tenantId: rental.tenantId,
      rentalId: rental.id,
    };
    let persistedVersion: number;
    let persistedUpdatedAt: Date;

    if (options?.expectedVersion !== undefined) {
      const update = await tx.v2Rental.updateMany({
        where: {
          id: rental.id,
          tenantId: rental.tenantId,
          version: options.expectedVersion,
        },
        data: {
          ...RentalMapper.toRentalUpdateData(rental),
          version: { increment: 1 },
        },
      });

      if (update.count === 0) {
        return null;
      }

      const persistedRental = await tx.v2Rental.findUniqueOrThrow({
        where: { id: rental.id },
        select: { version: true, updatedAt: true },
      });
      persistedVersion = persistedRental.version;
      persistedUpdatedAt = persistedRental.updatedAt;
    } else {
      const persistedRental = await tx.v2Rental.upsert({
        where: { id: rental.id },
        create: RentalMapper.toRentalCreateData(rental, options?.confirmationOperation),
        update: RentalMapper.toRentalUpdateData(rental),
        select: { version: true, updatedAt: true },
      });

      persistedVersion = persistedRental.version;
      persistedUpdatedAt = persistedRental.updatedAt;
    }

    if (options?.persistence === 'DETAILS') {
      if (options.ownerSplits !== undefined) {
        await tx.v2RentalOwnerSplit.deleteMany({ where: rentalWhere });
        if (options.ownerSplits.length > 0) {
          await tx.v2RentalOwnerSplit.createMany({
            data: options.ownerSplits.map(RentalMapper.toOwnerSplitCreateData),
          });
        }
      }

      return { version: persistedVersion, updatedAt: persistedUpdatedAt };
    }

    if (options?.ownerSplits !== undefined) {
      await tx.v2RentalOwnerSplit.deleteMany({ where: rentalWhere });
    }

    await tx.v2AssignedAsset.deleteMany({ where: rentalWhere });
    await tx.v2AssetBlock.deleteMany({ where: rentalWhere });

    await tx.v2RentalDeliveryDetails.deleteMany({
      where: {
        tenantId: rental.tenantId,
        rentalOrderId: rental.id,
      },
    });

    const deliveryDetails = RentalMapper.toDeliveryDetailsCreateData(rental);

    if (deliveryDetails) {
      await tx.v2RentalDeliveryDetails.create({
        data: deliveryDetails,
      });
    }

    for (const selection of rental.selections) {
      const updated = await tx.v2RentalSelection.updateMany({
        where: {
          id: selection.id,
          tenantId: selection.tenantId,
          rentalId: selection.rentalId,
        },
        data: RentalMapper.toSelectionUpdateData(selection),
      });

      if (updated.count === 0) {
        await tx.v2RentalSelection.create({
          data: RentalMapper.toSelectionCreateData(selection),
        });
      }
    }

    for (const demandLine of rental.demandLines) {
      const updated = await tx.v2RentalDemandLine.updateMany({
        where: {
          id: demandLine.id,
          tenantId: demandLine.tenantId,
          rentalId: demandLine.rentalId,
          rentalSelectionId: demandLine.rentalSelectionId,
        },
        data: RentalMapper.toDemandLineUpdateData(demandLine),
      });

      if (updated.count === 0) {
        await tx.v2RentalDemandLine.create({
          data: RentalMapper.toDemandLineCreateData(demandLine),
        });
      }
    }

    if (rental.assignedAssets.length > 0) {
      await tx.v2AssignedAsset.createMany({
        data: rental.assignedAssets.map(RentalMapper.toAssignedAssetCreateData),
      });
    }

    for (const block of rental.assetBlocks) {
      await tx.$executeRaw`
        INSERT INTO v2_asset_blocks (
          id,
          tenant_id,
          rental_id,
          asset_id,
          period,
          block_type,
          created_at,
          released_at
        ) VALUES (
          ${block.id},
          ${block.tenantId},
          ${block.rentalId},
          ${block.assetId},
          ${block.period.toPostgresRange()}::tstzrange,
          ${block.blockType},
          ${block.createdAt ?? new Date()},
          ${block.releasedAt ?? null}
        )
      `;
    }

    if (options?.ownerSplits !== undefined) {
      if (options.ownerSplits.length > 0) {
        await tx.v2RentalOwnerSplit.createMany({
          data: options.ownerSplits.map(RentalMapper.toOwnerSplitCreateData),
        });
      }
    }

    return { version: persistedVersion, updatedAt: persistedUpdatedAt };
  }

  private async findAssetBlocks(
    params: { tenantId: string; rentalId: string },
    db: PrismaTransactionClient | PrismaService['client'],
  ): Promise<AssetBlockPersistenceRecord[]> {
    return db.$queryRaw<AssetBlockPersistenceRecord[]>`
      SELECT
        id,
        tenant_id AS "tenantId",
        rental_id AS "rentalId",
        asset_id AS "assetId",
        period::text AS "period",
        block_type AS "blockType",
        created_at AS "createdAt",
        released_at AS "releasedAt"
      FROM v2_asset_blocks
      WHERE tenant_id = ${params.tenantId}
        AND rental_id = ${params.rentalId}
    `;
  }
}
