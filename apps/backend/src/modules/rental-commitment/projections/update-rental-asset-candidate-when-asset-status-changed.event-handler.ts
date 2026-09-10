import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PinoLogger } from 'nestjs-pino';

import { PrismaService } from 'src/core/database/prisma.service';
import { AssetStatusChangedIntegrationEvent } from 'src/modules/asset-inventory/public-api/events/asset-status-changed.integration-event';

@Injectable()
export class UpdateRentalAssetCandidateWhenAssetStatusChangedEventHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UpdateRentalAssetCandidateWhenAssetStatusChangedEventHandler.name);
  }

  @OnEvent(AssetStatusChangedIntegrationEvent.name)
  async handle(event: AssetStatusChangedIntegrationEvent): Promise<void> {
    try {
      // Update-only by design: a missing candidate row is legitimate and must
      // not be recreated by a status change.
      await this.prisma.client.v2RentalAssetCandidate.updateMany({
        where: {
          tenantId: event.tenantId,
          assetId: event.assetId,
        },
        data: {
          assetStatus: event.status,
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
        'Failed to update rental asset candidate after asset status change',
      );
    }
  }
}
