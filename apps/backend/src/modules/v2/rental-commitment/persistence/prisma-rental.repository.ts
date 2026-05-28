import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import { Rental } from '../domain/rental.aggregate';
import { RentalRepository, SaveRentalOptions } from './rental.repository';
import { AssetBlockPersistenceRecord, RentalMapper } from './rental.mapper';
import { mapPostgresError } from 'src/core/utils/postgres-error.mapper';

@Injectable()
export class PrismaRentalRepository extends RentalRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(tenantId: string, rentalId: string): Promise<Rental | null> {
    const rental = await this.prisma.client.v2Rental.findFirst({
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

    const assetBlocks = await this.findAssetBlocks({ tenantId, rentalId });

    return RentalMapper.toDomain({
      ...rental,
      assetBlocks,
    });
  }

  async save(rental: Rental, options?: Omit<SaveRentalOptions, 'tx'>): Promise<void> {
    try {
      await this.prisma.client.$transaction(async (tx) => {
        const rentalWhere = {
          tenantId: rental.tenantId,
          rentalId: rental.id,
        };

        await tx.v2Rental.upsert({
          where: { id: rental.id },
          create: RentalMapper.toRentalCreateData(rental),
          update: RentalMapper.toRentalUpdateData(rental),
        });

        await tx.v2AssignedAsset.deleteMany({ where: rentalWhere });
        await tx.v2RentalDemandLine.deleteMany({ where: rentalWhere });
        await tx.v2RentalSelection.deleteMany({ where: rentalWhere });
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
          await tx.v2RentalOwnerSplit.deleteMany({
            where: {
              tenantId: rental.tenantId,
              rentalId: rental.id,
            },
          });

          if (options.ownerSplits.length > 0) {
            await tx.v2RentalOwnerSplit.createMany({
              data: options.ownerSplits.map(RentalMapper.toOwnerSplitCreateData),
            });
          }
        }
      });
    } catch (error) {
      mapPostgresError(error);
    }
  }

  private async findAssetBlocks(params: {
    tenantId: string;
    rentalId: string;
  }): Promise<AssetBlockPersistenceRecord[]> {
    return this.prisma.client.$queryRaw<AssetBlockPersistenceRecord[]>`
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
