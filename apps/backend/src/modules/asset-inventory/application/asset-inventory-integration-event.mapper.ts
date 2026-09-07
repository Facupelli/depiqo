import { DomainEvent } from 'src/core/domain/events/domain-event';
import { IntegrationEvent } from 'src/core/domain/events/integration-event';

import { AssetCreatedDomainEvent } from '../domain/events/asset-created.domain-event';
import { AssetOwnershipChangedDomainEvent } from '../domain/events/asset-ownership-changed.domain-event';
import { AssetStatusChangedDomainEvent } from '../domain/events/asset-status-changed.domain-event';
import { AssetCreatedIntegrationEvent } from '../public-api/events/asset-created.integration-event';
import { AssetOwnershipChangedIntegrationEvent } from '../public-api/events/asset-ownership-changed.integration-event';
import { AssetStatusChangedIntegrationEvent } from '../public-api/events/asset-status-changed.integration-event';

export function toAssetInventoryIntegrationEvents(domainEvents: readonly DomainEvent[]): IntegrationEvent[] {
  return domainEvents.flatMap<IntegrationEvent>((event) => {
    if (event instanceof AssetCreatedDomainEvent) {
      return [new AssetCreatedIntegrationEvent({ ...event.props, occurredAt: event.occurredAt })];
    }

    if (event instanceof AssetOwnershipChangedDomainEvent) {
      return [
        new AssetOwnershipChangedIntegrationEvent({
          tenantId: event.props.tenantId,
          assetId: event.props.assetId,
          ownerId: event.props.ownerId,
          ownerContractSnapshot: event.props.ownerContractSnapshot,
          occurredAt: event.occurredAt,
        }),
      ];
    }

    if (event instanceof AssetStatusChangedDomainEvent) {
      return [
        new AssetStatusChangedIntegrationEvent({
          tenantId: event.props.tenantId,
          assetId: event.props.assetId,
          previousStatus: event.props.previousStatus,
          status: event.props.status,
          occurredAt: event.occurredAt,
        }),
      ];
    }

    return [];
  });
}
