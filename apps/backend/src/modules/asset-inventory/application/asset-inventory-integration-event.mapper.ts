import { DomainEvent } from 'src/core/domain/events/domain-event';
import { IntegrationEvent } from 'src/core/domain/events/integration-event';

import { AssetCreatedDomainEvent } from '../domain/events/asset-created.domain-event';
import { AssetCreatedIntegrationEvent } from '../public-api/events/asset-created.integration-event';

export function toAssetInventoryIntegrationEvents(domainEvents: readonly DomainEvent[]): IntegrationEvent[] {
  return domainEvents.flatMap<IntegrationEvent>((event) => {
    if (event instanceof AssetCreatedDomainEvent) {
      return [new AssetCreatedIntegrationEvent({ ...event.props, occurredAt: event.occurredAt })];
    }

    return [];
  });
}
