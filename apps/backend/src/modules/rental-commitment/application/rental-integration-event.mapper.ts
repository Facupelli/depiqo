import { DomainEvent } from 'src/core/domain/events/domain-event';
import { IntegrationEvent } from 'src/core/domain/events/integration-event';

import {
  ConfirmedRentalEditedDomainEvent,
  RentalCancelledDomainEvent,
  RentalConfirmedDomainEvent,
} from '../domain/events/rental-lifecycle.domain-events';
import {
  ConfirmedRentalEditedIntegrationEvent,
  RentalCancelledIntegrationEvent,
  RentalConfirmedIntegrationEvent,
} from '../public-api/events/rental-lifecycle.integration-events';

export function toRentalIntegrationEvents(domainEvents: readonly DomainEvent[]): IntegrationEvent[] {
  return domainEvents.flatMap<IntegrationEvent>((event) => {
    if (event instanceof RentalConfirmedDomainEvent) {
      return [new RentalConfirmedIntegrationEvent(event.tenantId, event.rentalId, event.occurredAt)];
    }

    if (event instanceof ConfirmedRentalEditedDomainEvent) {
      return [new ConfirmedRentalEditedIntegrationEvent(event.tenantId, event.rentalId, event.occurredAt)];
    }

    if (event instanceof RentalCancelledDomainEvent) {
      return [new RentalCancelledIntegrationEvent(event.tenantId, event.rentalId, event.occurredAt)];
    }

    return [];
  });
}
