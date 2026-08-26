import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { OnEvent } from '@nestjs/event-emitter';

import { PrismaService } from 'src/core/database/prisma.service';
import { Prisma, V2RentalAssetOwnershipKind } from 'src/generated/prisma/client';
import { AssetOwnershipChangedIntegrationEvent } from 'src/modules/asset-inventory/public-api/events/asset-ownership-changed.integration-event';

@Injectable()
export class UpdateRentalAssetCandidateWhenAssetOwnershipChangedEventHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UpdateRentalAssetCandidateWhenAssetOwnershipChangedEventHandler.name);
  }

  @OnEvent(AssetOwnershipChangedIntegrationEvent.name)
  async handle(event: AssetOwnershipChangedIntegrationEvent): Promise<void> {
    try {
      const ownershipKind = event.ownerId
        ? V2RentalAssetOwnershipKind.THIRD_PARTY
        : V2RentalAssetOwnershipKind.TENANT_OWNED;
      const ownerContractSnapshot = event.ownerContractSnapshot
        ? (event.ownerContractSnapshot as unknown as Prisma.InputJsonObject)
        : Prisma.JsonNull;

      // Update-only by design: a missing candidate row follows the same
      // synchronization policy as asset retirement and is not recreated here.
      await this.prisma.client.v2RentalAssetCandidate.updateMany({
        where: {
          tenantId: event.tenantId,
          assetId: event.assetId,
        },
        data: {
          ownershipKind,
          ownerId: event.ownerId,
          ownerContractSnapshot,
          projectedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        {
          err: error instanceof Error ? error : new Error('A non-Error value was thrown.', { cause: error }),
          assetId: event.assetId,
          tenantId: event.tenantId,
        },
        'Failed to update rental asset candidate after asset ownership changed',
      );
    }
  }
}
