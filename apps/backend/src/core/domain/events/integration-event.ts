export interface IntegrationEvent {
  readonly eventId: string;
  readonly eventName: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly occurredAt: Date;
  readonly schemaVersion: number;
  readonly tenantId?: string;
  readonly correlationId?: string;
  readonly causationId?: string;
}
