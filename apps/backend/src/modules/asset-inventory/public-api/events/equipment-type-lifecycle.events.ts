import { randomUUID } from 'node:crypto';

import { DomainEvent } from 'src/core/domain/events/domain-event';

abstract class EquipmentTypeLifecycleEvent implements DomainEvent {
  readonly eventId: string;
  abstract readonly eventName: string;
  readonly aggregateId: string;
  readonly aggregateType = 'EquipmentType';
  readonly occurredAt: Date;
  readonly schemaVersion = 1;

  constructor(
    public readonly tenantId: string,
    public readonly equipmentTypeId: string,
  ) {
    this.eventId = randomUUID();
    this.aggregateId = equipmentTypeId;
    this.occurredAt = new Date();
  }
}

export class EquipmentTypeDeactivatedIntegrationEvent extends EquipmentTypeLifecycleEvent {
  readonly eventName = EquipmentTypeDeactivatedIntegrationEvent.name;
}

export class EquipmentTypeReactivatedIntegrationEvent extends EquipmentTypeLifecycleEvent {
  readonly eventName = EquipmentTypeReactivatedIntegrationEvent.name;
}
