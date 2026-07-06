import { randomUUID } from 'node:crypto';

import { DomainEvent } from 'src/core/domain/events/domain-event';

export class RentalConfirmedEvent implements DomainEvent {
  readonly eventId = randomUUID();
  readonly eventName = RentalConfirmedEvent.name;
  readonly aggregateId: string;
  readonly aggregateType = 'Rental';
  readonly occurredAt = new Date();

  constructor(
    public readonly rentalId: string,
    public readonly tenantId: string,
  ) {
    this.aggregateId = rentalId;
  }
}
