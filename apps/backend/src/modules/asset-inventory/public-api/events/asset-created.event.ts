import { randomUUID } from 'node:crypto';

import { DomainEvent } from 'src/core/domain/events/domain-event';

type AssetCreatedStatus = 'ACTIVE' | 'INACTIVE' | 'RETIRED';

export interface AssetOwnerContractSnapshotPayload {
  ownerId: string;
  contractId: string;
  ownerShare: number;
  rentalShare: number;
  basis: 'GROSS' | 'NET';
}

interface AssetCreatedEventProps {
  eventId?: string;
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

export class AssetCreatedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventName = AssetCreatedEvent.name;
  readonly aggregateId: string;
  readonly aggregateType = 'Asset';
  readonly occurredAt: Date;
  readonly tenantId: string;
  readonly assetId: string;
  readonly branchId: string;
  readonly equipmentTypeId: string;
  readonly equipmentTypeIsActive: boolean;
  readonly status: AssetCreatedStatus;
  readonly ownerId: string | null;
  readonly ownerContractSnapshot: AssetOwnerContractSnapshotPayload | null;

  constructor(props: AssetCreatedEventProps) {
    this.eventId = props.eventId ?? randomUUID();
    this.aggregateId = props.assetId;
    this.occurredAt = props.occurredAt ?? new Date();
    this.tenantId = props.tenantId;
    this.assetId = props.assetId;
    this.branchId = props.branchId;
    this.equipmentTypeId = props.equipmentTypeId;
    this.equipmentTypeIsActive = props.equipmentTypeIsActive;
    this.status = props.status;
    this.ownerId = props.ownerId;
    this.ownerContractSnapshot = props.ownerContractSnapshot;
  }
}
