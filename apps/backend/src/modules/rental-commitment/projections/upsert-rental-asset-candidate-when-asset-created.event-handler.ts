import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { PrismaService } from 'src/core/database/prisma.service';
import { AppLogger } from 'src/core/logger/app-logger.service';
import { AssetCreatedEvent } from 'src/modules/asset-inventory/public-api/events/asset-created.event';
import { Prisma, V2RentalAssetOwnershipKind } from 'src/generated/prisma/client';

@Injectable()
export class UpsertRentalAssetCandidateWhenAssetCreatedEventHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {}

  @OnEvent(AssetCreatedEvent.name)
  async handle(event: AssetCreatedEvent): Promise<void> {
    try {
      const projectedAt = new Date();
      const ownershipKind = event.ownerId
        ? V2RentalAssetOwnershipKind.THIRD_PARTY
        : V2RentalAssetOwnershipKind.TENANT_OWNED;

      const ownerContractSnapshot = event.ownerContractSnapshot
        ? (event.ownerContractSnapshot as unknown as Prisma.InputJsonObject)
        : Prisma.JsonNull;

      await this.prisma.client.v2RentalAssetCandidate.upsert({
        where: {
          tenantId_assetId: {
            tenantId: event.tenantId,
            assetId: event.assetId,
          },
        },
        create: {
          tenantId: event.tenantId,
          assetId: event.assetId,
          branchId: event.branchId,
          equipmentTypeId: event.equipmentTypeId,
          assetStatus: event.status,
          isActive: event.status === 'ACTIVE',
          isRentable: true,
          ownershipKind,
          ownerId: event.ownerId,
          ownerContractSnapshot,
          projectedAt,
          sourceVersion: null,
        },
        update: {
          branchId: event.branchId,
          equipmentTypeId: event.equipmentTypeId,
          assetStatus: event.status,
          isActive: event.status === 'ACTIVE',
          isRentable: true,
          ownershipKind,
          ownerId: event.ownerId,
          ownerContractSnapshot,
          projectedAt,
          sourceVersion: null,
        },
      });
    } catch (error) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to upsert rental asset candidate for asset=${event.assetId} tenant=${event.tenantId}`,
        stack,
        UpsertRentalAssetCandidateWhenAssetCreatedEventHandler.name,
      );
    }
  }
}
