import { randomUUID } from 'node:crypto';

import { DomainEvent } from 'src/core/domain/events/domain-event';

abstract class EquipmentTypeLifecycleDomainEvent implements DomainEvent {
  readonly eventId = randomUUID();
  abstract readonly eventName: string;
  readonly aggregateType = 'EquipmentType';
  readonly occurredAt = new Date();

  constructor(
    public readonly tenantId: string,
    public readonly equipmentTypeId: string,
  ) {}

  get aggregateId(): string {
    return this.equipmentTypeId;
  }
}

export class EquipmentTypeDeactivatedDomainEvent extends EquipmentTypeLifecycleDomainEvent {
  readonly eventName = EquipmentTypeDeactivatedDomainEvent.name;
}

export class EquipmentTypeReactivatedDomainEvent extends EquipmentTypeLifecycleDomainEvent {
  readonly eventName = EquipmentTypeReactivatedDomainEvent.name;
}
