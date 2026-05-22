import { randomUUID } from 'crypto';

import { DomainEvent } from 'src/core/domain/events/domain-event';

interface OrderApprovedEventProps {
  orderId: string;
  tenantId: string;
  customerId: string | null;
  reviewedByUserId: string;
  occurredAt?: Date;
}

export class OrderApprovedEvent implements DomainEvent {
  static readonly EVENT_NAME = 'OrderApprovedEvent';

  public readonly eventId = randomUUID();
  public readonly eventName = OrderApprovedEvent.EVENT_NAME;
  public readonly aggregateId: string;
  public readonly aggregateType = 'Order';
  public readonly tenantId: string;
  public readonly customerId: string | null;
  public readonly reviewedByUserId: string;
  public readonly occurredAt: Date;

  constructor(props: OrderApprovedEventProps) {
    this.aggregateId = props.orderId;
    this.tenantId = props.tenantId;
    this.customerId = props.customerId;
    this.reviewedByUserId = props.reviewedByUserId;
    this.occurredAt = props.occurredAt ?? new Date();
  }
}
