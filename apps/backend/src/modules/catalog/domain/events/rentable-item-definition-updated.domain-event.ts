import { randomUUID } from 'node:crypto';

import { DomainEvent } from 'src/core/domain/events/domain-event';

export class RentableItemDefinitionUpdatedDomainEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventName = RentableItemDefinitionUpdatedDomainEvent.name;
  readonly aggregateId: string;
  readonly aggregateType = 'RentableItem';
  readonly occurredAt: Date;

  constructor(
    public readonly rentableItemId: string,
    public readonly tenantId: string,
    occurredAt?: Date,
    eventId?: string,
  ) {
    this.eventId = eventId ?? randomUUID();
    this.aggregateId = rentableItemId;
    this.occurredAt = occurredAt ?? new Date();
  }
}
