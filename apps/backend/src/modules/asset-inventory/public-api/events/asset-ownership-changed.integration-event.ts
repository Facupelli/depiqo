import { randomUUID } from 'node:crypto';

import { IntegrationEvent } from 'src/core/domain/events/integration-event';

import type { AssetOwnerContractSnapshotPayload } from './asset-created.integration-event';

export interface AssetOwnershipChangedIntegrationEventProps {
  eventId?: string;
  tenantId: string;
  assetId: string;
  ownerId: string | null;
  ownerContractSnapshot: AssetOwnerContractSnapshotPayload | null;
  occurredAt?: Date;
}

export class AssetOwnershipChangedIntegrationEvent implements IntegrationEvent {
  readonly eventId: string;
  readonly eventName = AssetOwnershipChangedIntegrationEvent.name;
  readonly aggregateId: string;
  readonly aggregateType = 'Asset';
  readonly occurredAt: Date;
  readonly schemaVersion = 1;
  readonly tenantId: string;
  readonly assetId: string;
  readonly ownerId: string | null;
  readonly ownerContractSnapshot: AssetOwnerContractSnapshotPayload | null;

  constructor(props: AssetOwnershipChangedIntegrationEventProps) {
    this.eventId = props.eventId ?? randomUUID();
    this.aggregateId = props.assetId;
    this.occurredAt = props.occurredAt ?? new Date();
    this.tenantId = props.tenantId;
    this.assetId = props.assetId;
    this.ownerId = props.ownerId;
    this.ownerContractSnapshot = props.ownerContractSnapshot;
  }
}
