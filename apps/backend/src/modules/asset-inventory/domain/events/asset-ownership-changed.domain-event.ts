import { randomUUID } from 'node:crypto';

import { DomainEvent } from 'src/core/domain/events/domain-event';

import type { AssetOwnerContractSnapshotPayload } from './asset-created.domain-event';

export interface AssetOwnershipChangedDomainEventProps {
  tenantId: string;
  assetId: string;
  ownerId: string | null;
  ownerContractSnapshot: AssetOwnerContractSnapshotPayload | null;
  occurredAt?: Date;
}

export class AssetOwnershipChangedDomainEvent implements DomainEvent {
  readonly eventId = randomUUID();
  readonly eventName = AssetOwnershipChangedDomainEvent.name;
  readonly aggregateId: string;
  readonly aggregateType = 'Asset';
  readonly occurredAt: Date;

  constructor(public readonly props: AssetOwnershipChangedDomainEventProps) {
    this.aggregateId = props.assetId;
    this.occurredAt = props.occurredAt ?? new Date();
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
}
