import { randomUUID } from 'node:crypto';

import { IntegrationEvent } from 'src/core/domain/events/integration-event';

abstract class RentalLifecycleIntegrationEvent implements IntegrationEvent {
  readonly eventId: string;
  abstract readonly eventName: string;
  readonly aggregateId: string;
  readonly aggregateType = 'Rental';
  readonly occurredAt: Date;
  readonly schemaVersion = 1;

  constructor(
    public readonly tenantId: string,
    public readonly rentalId: string,
    occurredAt?: Date,
    eventId?: string,
  ) {
    this.eventId = eventId ?? randomUUID();
    this.aggregateId = rentalId;
    this.occurredAt = occurredAt ?? new Date();
  }
}

export class RentalConfirmedIntegrationEvent extends RentalLifecycleIntegrationEvent {
  readonly eventName = RentalConfirmedIntegrationEvent.name;
}

export class ConfirmedRentalEditedIntegrationEvent extends RentalLifecycleIntegrationEvent {
  readonly eventName = ConfirmedRentalEditedIntegrationEvent.name;
}

export class RentalCancelledIntegrationEvent extends RentalLifecycleIntegrationEvent {
  readonly eventName = RentalCancelledIntegrationEvent.name;
}
