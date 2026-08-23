import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';
import { mapPostgresError } from 'src/core/utils/postgres-error.mapper';

import { Rental } from '../domain/rental.aggregate';
import { RentalRepository, SaveRentalOptions, SaveRentalResult } from './rental.repository';
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
      await tx.v2RentalDeliveryDetails.deleteMany({
        where: {
          tenantId: rental.tenantId,
          rentalOrderId: rental.id,
        },
      });

      const deliveryDetails = RentalMapper.toDeliveryDetailsCreateData(rental);
      if (deliveryDetails) {
        await tx.v2RentalDeliveryDetails.create({ data: deliveryDetails });
      }

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

    if (options?.replaceAccessories) {
      await tx.v2RentalAccessoryAssetAssignment.deleteMany({
        where: { tenantId: rental.tenantId, rentalOrderId: rental.id },
      });
      await tx.v2RentalAccessorySelection.deleteMany({
        where: { tenantId: rental.tenantId, rentalOrderId: rental.id },
      });
    }

    if (options?.ownerSplits !== undefined) {
      await tx.v2RentalOwnerSplit.deleteMany({ where: rentalWhere });
    }

    await tx.v2AssignedAsset.deleteMany({ where: rentalWhere });
    await tx.v2AssetBlock.deleteMany({ where: rentalWhere });
    await tx.v2RentalDemandLine.deleteMany({ where: rentalWhere });
    await tx.v2RentalSelection.deleteMany({ where: rentalWhere });

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

    if (rental.assignedAssets.length > 0) {
      await tx.v2AssignedAsset.createMany({
        data: rental.assignedAssets.map(RentalMapper.toAssignedAssetCreateData),
      });
    }

    for (const block of rental.assetBlocks.filter(
      (block) => options?.accessoryAssetIds === undefined || block.blockType === 'EQUIPMENT',
    )) {
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

    if (options?.accessoryAssetIds !== undefined) {
      for (const assetId of options.accessoryAssetIds) {
        await tx.$executeRaw`
          INSERT INTO v2_asset_blocks (
            id, tenant_id, rental_id, asset_id, period, block_type, created_at, released_at
          ) VALUES (
            ${randomUUID()}, ${rental.tenantId}, ${rental.id}, ${assetId},
            ${rental.period.toPostgresRange()}::tstzrange, 'ACCESSORY', ${new Date()}, ${null}
          )
        `;
      }
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
