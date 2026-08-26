import { randomUUID } from 'node:crypto';

import { DomainEvent } from 'src/core/domain/events/domain-event';

import { FulfillmentMethod, RentalStatus } from '../rental-status';

abstract class RentalLifecycleDomainEvent implements DomainEvent {
  readonly eventId: string;
  abstract readonly eventName: string;
  readonly aggregateId: string;
  readonly aggregateType = 'Rental';
  readonly occurredAt: Date;

  constructor(
    public readonly tenantId: string,
    public readonly rentalId: string,
    public readonly rentalCustomerId: string | null,
    public readonly branchId: string,
    occurredAt?: Date,
    eventId?: string,
  ) {
    this.eventId = eventId ?? randomUUID();
    this.aggregateId = rentalId;
    this.occurredAt = occurredAt ?? new Date();
  }
}

export class RentalConfirmedDomainEvent extends RentalLifecycleDomainEvent {
  readonly eventName = RentalConfirmedDomainEvent.name;

  constructor(
    tenantId: string,
    rentalId: string,
    public readonly rentalNumber: number,
    public readonly rentalCustomerId: string,
    branchId: string,
    public readonly status: RentalStatus.Confirmed,
    public readonly fulfillmentMethod: FulfillmentMethod,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    occurredAt?: Date,
  ) {
    super(tenantId, rentalId, rentalCustomerId, branchId, occurredAt);
  }
}

export class ConfirmedRentalEditedDomainEvent extends RentalLifecycleDomainEvent {
  readonly eventName = ConfirmedRentalEditedDomainEvent.name;

  constructor(
    tenantId: string,
    rentalId: string,
    public readonly rentalCustomerId: string,
    branchId: string,
    public readonly status: RentalStatus.Confirmed,
    public readonly fulfillmentMethod: FulfillmentMethod,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    occurredAt?: Date,
  ) {
    super(tenantId, rentalId, rentalCustomerId, branchId, occurredAt);
  }
}

export class RentalCancelledDomainEvent extends RentalLifecycleDomainEvent {
  readonly eventName = RentalCancelledDomainEvent.name;

  constructor(
    tenantId: string,
    rentalId: string,
    rentalCustomerId: string | null,
    branchId: string,
    public readonly cancelledAt: Date,
  ) {
    super(tenantId, rentalId, rentalCustomerId, branchId, cancelledAt);
  }
}
