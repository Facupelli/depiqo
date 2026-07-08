import { randomUUID } from 'node:crypto';

import { DomainEvent } from 'src/core/domain/events/domain-event';

export interface RentalCancelledEventProps {
  eventId?: string;
  tenantId: string;
  rentalId: string;
  rentalCustomerId: string | null;
  branchId: string;
  cancelledAt: Date;
  occurredAt?: Date;
}

export class RentalCancelledEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventName = RentalCancelledEvent.name;
  readonly aggregateId: string;
  readonly aggregateType = 'Rental';
  readonly occurredAt: Date;
  readonly tenantId: string;
  readonly rentalId: string;
  readonly rentalCustomerId: string | null;
  readonly branchId: string;
  readonly cancelledAt: Date;

  constructor(props: RentalCancelledEventProps) {
    this.eventId = props.eventId ?? randomUUID();
    this.aggregateId = props.rentalId;
    this.occurredAt = props.occurredAt ?? new Date();
    this.tenantId = props.tenantId;
    this.rentalId = props.rentalId;
    this.rentalCustomerId = props.rentalCustomerId;
    this.branchId = props.branchId;
    this.cancelledAt = props.cancelledAt;
  }
}
