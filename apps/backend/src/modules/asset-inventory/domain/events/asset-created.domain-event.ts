import { randomUUID } from 'node:crypto';

import { DomainEvent } from 'src/core/domain/events/domain-event';

export type AssetCreatedStatus = 'ACTIVE' | 'INACTIVE' | 'RETIRED';

export interface AssetOwnerContractSnapshotPayload {
  ownerId: string;
  contractId: string;
  ownerShare: number;
  rentalShare: number;
  basis: 'GROSS' | 'NET';
}

export interface AssetCreatedDomainEventProps {
  tenantId: string;
  assetId: string;
  branchId: string;
  equipmentTypeId: string;
  equipmentTypeIsActive: boolean;
  status: AssetCreatedStatus;
  ownerId: string | null;
  ownerContractSnapshot: AssetOwnerContractSnapshotPayload | null;
  occurredAt?: Date;
}

export class AssetCreatedDomainEvent implements DomainEvent {
  readonly eventId = randomUUID();
  readonly eventName = AssetCreatedDomainEvent.name;
  readonly aggregateId: string;
  readonly aggregateType = 'Asset';
  readonly occurredAt: Date;

  constructor(public readonly props: AssetCreatedDomainEventProps) {
    this.aggregateId = props.assetId;
    this.occurredAt = props.occurredAt ?? new Date();
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
}
