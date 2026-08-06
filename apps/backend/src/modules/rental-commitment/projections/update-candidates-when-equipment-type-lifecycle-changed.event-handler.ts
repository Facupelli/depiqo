import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from 'src/core/database/prisma.service';
import {
  EquipmentTypeDeactivatedIntegrationEvent,
  EquipmentTypeReactivatedIntegrationEvent,
} from 'src/modules/asset-inventory/public-api/events/equipment-type-lifecycle.events';

@Injectable()
export class UpdateCandidatesWhenEquipmentTypeLifecycleChangedEventHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UpdateCandidatesWhenEquipmentTypeLifecycleChangedEventHandler.name);
  }
  @OnEvent(EquipmentTypeDeactivatedIntegrationEvent.name)
  async deactivate(event: EquipmentTypeDeactivatedIntegrationEvent): Promise<void> {
    await this.update(event, false);
  }
  @OnEvent(EquipmentTypeReactivatedIntegrationEvent.name)
  async reactivate(event: EquipmentTypeReactivatedIntegrationEvent): Promise<void> {
    await this.update(event, true);
  }
  private async update(
    event: { tenantId: string; equipmentTypeId: string },
    equipmentTypeIsActive: boolean,
  ): Promise<void> {
    try {
      await this.prisma.client.v2RentalAssetCandidate.updateMany({
        where: { tenantId: event.tenantId, equipmentTypeId: event.equipmentTypeId },
        data: { equipmentTypeIsActive },
      });
    } catch (error) {
      this.logger.error(
        {
          err: error instanceof Error ? error : new Error('A non-Error value was thrown.', { cause: error }),
          tenantId: event.tenantId,
          equipmentTypeId: event.equipmentTypeId,
        },
        'Failed to update equipment type lifecycle in rental asset candidates',
      );
    }
  }
}
