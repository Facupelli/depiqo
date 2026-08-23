import { randomUUID } from 'node:crypto';

import { IntegrationEvent } from 'src/core/domain/events/integration-event';

export interface AssetRetiredIntegrationEventProps {
  eventId?: string;
  tenantId: string;
  assetId: string;
  occurredAt?: Date;
}

export class AssetRetiredIntegrationEvent implements IntegrationEvent {
  readonly eventId: string;
  readonly eventName = AssetRetiredIntegrationEvent.name;
  readonly aggregateId: string;
  readonly aggregateType = 'Asset';
  readonly occurredAt: Date;
  readonly schemaVersion = 1;
  readonly tenantId: string;
  readonly assetId: string;

  constructor(props: AssetRetiredIntegrationEventProps) {
    this.eventId = props.eventId ?? randomUUID();
    this.aggregateId = props.assetId;
    this.occurredAt = props.occurredAt ?? new Date();
    this.tenantId = props.tenantId;
    this.assetId = props.assetId;
  }
}
