import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { OnEvent } from '@nestjs/event-emitter';

import { PrismaService } from 'src/core/database/prisma.service';
import { AssetRetiredIntegrationEvent } from 'src/modules/asset-inventory/public-api/events/asset-retired.integration-event';

@Injectable()
export class UpdateRentalAssetCandidateWhenAssetRetiredEventHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UpdateRentalAssetCandidateWhenAssetRetiredEventHandler.name);
  }

  @OnEvent(AssetRetiredIntegrationEvent.name)
  async handle(event: AssetRetiredIntegrationEvent): Promise<void> {
    try {
      // Update-only by design: a missing candidate row is legitimate (e.g. the
      // asset's equipment type is inactive) and must not be recreated here.
      await this.prisma.client.v2RentalAssetCandidate.updateMany({
        where: {
          tenantId: event.tenantId,
          assetId: event.assetId,
        },
        data: {
          assetStatus: 'RETIRED',
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
        'Failed to update rental asset candidate after asset retirement',
      );
    }
  }
}
