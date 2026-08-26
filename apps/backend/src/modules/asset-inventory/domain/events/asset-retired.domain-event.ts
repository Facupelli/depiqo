import { randomUUID } from 'node:crypto';

import { DomainEvent } from 'src/core/domain/events/domain-event';

export interface AssetRetiredDomainEventProps {
  tenantId: string;
  assetId: string;
  occurredAt?: Date;
}

export class AssetRetiredDomainEvent implements DomainEvent {
  readonly eventId = randomUUID();
  readonly eventName = AssetRetiredDomainEvent.name;
  readonly aggregateId: string;
  readonly aggregateType = 'Asset';
  readonly occurredAt: Date;

  constructor(public readonly props: AssetRetiredDomainEventProps) {
    this.aggregateId = props.assetId;
    this.occurredAt = props.occurredAt ?? new Date();
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
}
