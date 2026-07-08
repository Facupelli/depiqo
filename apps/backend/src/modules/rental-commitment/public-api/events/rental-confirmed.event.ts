import { randomUUID } from 'node:crypto';

import { DomainEvent } from 'src/core/domain/events/domain-event';

import { FulfillmentMethod, RentalStatus } from '../../domain/rental-status';

export interface RentalConfirmedEventProps {
  eventId?: string;
  tenantId: string;
  rentalId: string;
  rentalCustomerId: string;
  branchId: string;
  status: RentalStatus.Confirmed;
  fulfillmentMethod: FulfillmentMethod;
  occurredAt?: Date;
}

export class RentalConfirmedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventName = RentalConfirmedEvent.name;
  readonly aggregateId: string;
  readonly aggregateType = 'Rental';
  readonly occurredAt: Date;
  readonly tenantId: string;
  readonly rentalId: string;
  readonly rentalCustomerId: string;
  readonly branchId: string;
  readonly status: RentalStatus.Confirmed;
  readonly fulfillmentMethod: FulfillmentMethod;

  constructor(props: RentalConfirmedEventProps) {
    this.eventId = props.eventId ?? randomUUID();
    this.aggregateId = props.rentalId;
    this.occurredAt = props.occurredAt ?? new Date();
    this.tenantId = props.tenantId;
    this.rentalId = props.rentalId;
    this.rentalCustomerId = props.rentalCustomerId;
    this.branchId = props.branchId;
    this.status = props.status;
    this.fulfillmentMethod = props.fulfillmentMethod;
  }
}
