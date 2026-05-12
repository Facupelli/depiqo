import { randomUUID } from 'crypto';

import { DomainEvent } from 'src/core/domain/events/domain-event';

interface OrderRejectedEventProps {
  orderId: string;
  tenantId: string;
  customerId: string | null;
  reviewedByUserId: string;
  rejectionReason: string | null;
  occurredAt?: Date;
}

export class OrderRejectedEvent implements DomainEvent {
  static readonly EVENT_NAME = 'OrderRejectedEvent';

  public readonly eventId = randomUUID();
  public readonly eventName = OrderRejectedEvent.EVENT_NAME;
  public readonly aggregateId: string;
  public readonly aggregateType = 'Order';
  public readonly tenantId: string;
  public readonly customerId: string | null;
  public readonly reviewedByUserId: string;
  public readonly rejectionReason: string | null;
  public readonly occurredAt: Date;

  constructor(props: OrderRejectedEventProps) {
    this.aggregateId = props.orderId;
    this.tenantId = props.tenantId;
    this.customerId = props.customerId;
    this.reviewedByUserId = props.reviewedByUserId;
    this.rejectionReason = props.rejectionReason;
    this.occurredAt = props.occurredAt ?? new Date();
  }
}
