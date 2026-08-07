import { DomainEvent } from 'src/core/domain/events/domain-event';
import { IntegrationEvent } from 'src/core/domain/events/integration-event';

import { AssetCreatedDomainEvent } from '../domain/events/asset-created.domain-event';
import {
  EquipmentTypeDeactivatedDomainEvent,
  EquipmentTypeReactivatedDomainEvent,
} from '../domain/events/equipment-type-lifecycle.domain-events';
import { AssetCreatedIntegrationEvent } from '../public-api/events/asset-created.integration-event';
import {
  EquipmentTypeDeactivatedIntegrationEvent,
  EquipmentTypeReactivatedIntegrationEvent,
} from '../public-api/events/equipment-type-lifecycle.integration-events';

export function toAssetInventoryIntegrationEvents(domainEvents: readonly DomainEvent[]): IntegrationEvent[] {
  return domainEvents.flatMap<IntegrationEvent>((event) => {
    if (event instanceof AssetCreatedDomainEvent) {
      return [new AssetCreatedIntegrationEvent({ ...event.props, occurredAt: event.occurredAt })];
    }

    if (event instanceof EquipmentTypeDeactivatedDomainEvent) {
      return [new EquipmentTypeDeactivatedIntegrationEvent(event.tenantId, event.equipmentTypeId, event.occurredAt)];
    }

    if (event instanceof EquipmentTypeReactivatedDomainEvent) {
      return [new EquipmentTypeReactivatedIntegrationEvent(event.tenantId, event.equipmentTypeId, event.occurredAt)];
    }

    return [];
  });
}
