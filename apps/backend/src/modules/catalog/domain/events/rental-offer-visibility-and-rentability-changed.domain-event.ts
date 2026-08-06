import { randomUUID } from 'node:crypto';

import { DomainEvent } from 'src/core/domain/events/domain-event';

export class RentalOfferVisibilityAndRentabilityChangedDomainEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventName = RentalOfferVisibilityAndRentabilityChangedDomainEvent.name;
  readonly aggregateId: string;
  readonly aggregateType = 'RentalOffer';
  readonly occurredAt: Date;

  constructor(
    public readonly rentalOfferId: string,
    public readonly tenantId: string,
    public readonly isVisible: boolean,
    public readonly isRentable: boolean,
    occurredAt?: Date,
    eventId?: string,
  ) {
    this.eventId = eventId ?? randomUUID();
    this.aggregateId = rentalOfferId;
    this.occurredAt = occurredAt ?? new Date();
  }
}
