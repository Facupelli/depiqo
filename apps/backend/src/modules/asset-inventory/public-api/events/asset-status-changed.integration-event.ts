import { randomUUID } from 'node:crypto';

import { IntegrationEvent } from 'src/core/domain/events/integration-event';

export type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'RETIRED';

export interface AssetStatusChangedIntegrationEventProps {
  eventId?: string;
  tenantId: string;
  assetId: string;
  previousStatus: AssetStatus;
  status: AssetStatus;
  occurredAt?: Date;
}

export class AssetStatusChangedIntegrationEvent implements IntegrationEvent {
  readonly eventId: string;
  readonly eventName = AssetStatusChangedIntegrationEvent.name;
  readonly aggregateId: string;
  readonly aggregateType = 'Asset';
  readonly occurredAt: Date;
  readonly schemaVersion = 1;
  readonly tenantId: string;
  readonly assetId: string;
  readonly previousStatus: AssetStatus;
  readonly status: AssetStatus;

  constructor(props: AssetStatusChangedIntegrationEventProps) {
    this.eventId = props.eventId ?? randomUUID();
    this.aggregateId = props.assetId;
    this.occurredAt = props.occurredAt ?? new Date();
    this.tenantId = props.tenantId;
    this.assetId = props.assetId;
    this.previousStatus = props.previousStatus;
    this.status = props.status;
  }
}
