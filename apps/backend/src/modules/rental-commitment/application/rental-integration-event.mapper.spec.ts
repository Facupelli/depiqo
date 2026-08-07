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
import { FulfillmentMethod, RentalStatus } from '../domain/rental-status';

import { toRentalIntegrationEvents } from './rental-integration-event.mapper';

describe('toRentalIntegrationEvents', () => {
  it('translates private rental lifecycle events into minimal public integration events', () => {
    const occurredAt = new Date('2026-08-08T12:00:00.000Z');
    const events = toRentalIntegrationEvents([
      new RentalConfirmedDomainEvent(
        'tenant-1',
        'rental-1',
        'customer-1',
        'branch-1',
        RentalStatus.Confirmed,
        FulfillmentMethod.Pickup,
        occurredAt,
      ),
      new ConfirmedRentalEditedDomainEvent(
        'tenant-1',
        'rental-2',
        'customer-2',
        'branch-1',
        RentalStatus.Confirmed,
        FulfillmentMethod.Delivery,
        occurredAt,
      ),
      new RentalCancelledDomainEvent('tenant-1', 'rental-3', null, 'branch-1', occurredAt),
    ]);

    expect(events).toEqual([
      expect.objectContaining({
        eventName: RentalConfirmedIntegrationEvent.name,
        schemaVersion: 1,
        tenantId: 'tenant-1',
        rentalId: 'rental-1',
        occurredAt,
      }),
      expect.objectContaining({
        eventName: ConfirmedRentalEditedIntegrationEvent.name,
        schemaVersion: 1,
        tenantId: 'tenant-1',
        rentalId: 'rental-2',
        occurredAt,
      }),
      expect.objectContaining({
        eventName: RentalCancelledIntegrationEvent.name,
        schemaVersion: 1,
        tenantId: 'tenant-1',
        rentalId: 'rental-3',
        occurredAt,
      }),
    ]);

    expect(events[0]).not.toHaveProperty('rentalCustomerId');
    expect(events[0]).not.toHaveProperty('fulfillmentMethod');
  });
});
