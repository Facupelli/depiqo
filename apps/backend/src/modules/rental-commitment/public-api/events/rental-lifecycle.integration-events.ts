import { randomUUID } from 'node:crypto';

import { IntegrationEvent } from 'src/core/domain/events/integration-event';

export type RentalLifecycleEventStatus = 'CONFIRMED';
export type RentalLifecycleEventFulfillmentMethod = 'PICKUP' | 'DELIVERY';

abstract class RentalLifecycleIntegrationEvent implements IntegrationEvent {
  readonly eventId: string;
  abstract readonly eventName: string;
  abstract readonly schemaVersion: number;
  readonly aggregateId: string;
  readonly aggregateType = 'Rental';
  readonly occurredAt: Date;

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
  readonly schemaVersion = 3;

  constructor(
    tenantId: string,
    rentalId: string,
    public readonly rentalNumber: number,
    public readonly rentalCustomerId: string,
    public readonly branchId: string,
    public readonly status: RentalLifecycleEventStatus,
    public readonly fulfillmentMethod: RentalLifecycleEventFulfillmentMethod,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    occurredAt?: Date,
    eventId?: string,
  ) {
    super(tenantId, rentalId, occurredAt, eventId);
  }
}

export class ConfirmedRentalEditedIntegrationEvent extends RentalLifecycleIntegrationEvent {
  readonly eventName = ConfirmedRentalEditedIntegrationEvent.name;
  readonly schemaVersion = 2;

  constructor(
    tenantId: string,
    rentalId: string,
    public readonly rentalCustomerId: string,
    public readonly branchId: string,
    public readonly status: RentalLifecycleEventStatus,
    public readonly fulfillmentMethod: RentalLifecycleEventFulfillmentMethod,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    occurredAt?: Date,
    eventId?: string,
  ) {
    super(tenantId, rentalId, occurredAt, eventId);
  }
}

export class RentalCancelledIntegrationEvent extends RentalLifecycleIntegrationEvent {
  readonly eventName = RentalCancelledIntegrationEvent.name;
  readonly schemaVersion = 2;

  constructor(
    tenantId: string,
    rentalId: string,
    public readonly rentalCustomerId: string | null,
    occurredAt?: Date,
    eventId?: string,
  ) {
    super(tenantId, rentalId, occurredAt, eventId);
  }
}
