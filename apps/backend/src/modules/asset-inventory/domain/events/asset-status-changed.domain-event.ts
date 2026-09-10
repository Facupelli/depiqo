import { randomUUID } from 'node:crypto';

import { DomainEvent } from 'src/core/domain/events/domain-event';

import type { AssetStatus } from '../asset.entity';

export interface AssetStatusChangedDomainEventProps {
  tenantId: string;
  assetId: string;
  previousStatus: AssetStatus;
  status: AssetStatus;
  occurredAt?: Date;
}

export class AssetStatusChangedDomainEvent implements DomainEvent {
  readonly eventId = randomUUID();
  readonly eventName = AssetStatusChangedDomainEvent.name;
  readonly aggregateId: string;
  readonly aggregateType = 'Asset';
  readonly occurredAt: Date;

  constructor(public readonly props: AssetStatusChangedDomainEventProps) {
    this.aggregateId = props.assetId;
    this.occurredAt = props.occurredAt ?? new Date();
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
}
