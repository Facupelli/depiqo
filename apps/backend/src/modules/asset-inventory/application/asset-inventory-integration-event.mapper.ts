import { DomainEvent } from 'src/core/domain/events/domain-event';
import { IntegrationEvent } from 'src/core/domain/events/integration-event';

import { AssetCreatedDomainEvent } from '../domain/events/asset-created.domain-event';
import { AssetRetiredDomainEvent } from '../domain/events/asset-retired.domain-event';
import { AssetCreatedIntegrationEvent } from '../public-api/events/asset-created.integration-event';
import { AssetRetiredIntegrationEvent } from '../public-api/events/asset-retired.integration-event';

export function toAssetInventoryIntegrationEvents(domainEvents: readonly DomainEvent[]): IntegrationEvent[] {
  return domainEvents.flatMap<IntegrationEvent>((event) => {
    if (event instanceof AssetCreatedDomainEvent) {
      return [new AssetCreatedIntegrationEvent({ ...event.props, occurredAt: event.occurredAt })];
    }

    if (event instanceof AssetRetiredDomainEvent) {
      return [
        new AssetRetiredIntegrationEvent({
          tenantId: event.props.tenantId,
          assetId: event.props.assetId,
          occurredAt: event.occurredAt,
        }),
      ];
    }

    return [];
  });
}
