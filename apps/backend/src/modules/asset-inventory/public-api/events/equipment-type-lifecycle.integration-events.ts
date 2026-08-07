import { randomUUID } from 'node:crypto';

import { IntegrationEvent } from 'src/core/domain/events/integration-event';

abstract class EquipmentTypeLifecycleIntegrationEvent implements IntegrationEvent {
  readonly eventId: string;
  abstract readonly eventName: string;
  readonly aggregateId: string;
  readonly aggregateType = 'EquipmentType';
  readonly occurredAt: Date;
  readonly schemaVersion = 1;

  constructor(
    public readonly tenantId: string,
    public readonly equipmentTypeId: string,
    occurredAt?: Date,
    eventId?: string,
  ) {
    this.eventId = eventId ?? randomUUID();
    this.aggregateId = equipmentTypeId;
    this.occurredAt = occurredAt ?? new Date();
  }
}

export class EquipmentTypeDeactivatedIntegrationEvent extends EquipmentTypeLifecycleIntegrationEvent {
  readonly eventName = EquipmentTypeDeactivatedIntegrationEvent.name;
}

export class EquipmentTypeReactivatedIntegrationEvent extends EquipmentTypeLifecycleIntegrationEvent {
  readonly eventName = EquipmentTypeReactivatedIntegrationEvent.name;
}
