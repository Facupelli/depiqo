import {
  ConfirmedRentalEditedDomainEvent,
  RentalCancelledDomainEvent,
  RentalConfirmedDomainEvent,
} from '../domain/events/rental-lifecycle.domain-events';
import { FulfillmentMethod, RentalStatus } from '../domain/rental-status';
import {
  ConfirmedRentalEditedIntegrationEvent,
  RentalCancelledIntegrationEvent,
  RentalConfirmedIntegrationEvent,
} from '../public-api/events/rental-lifecycle.integration-events';

import { toRentalIntegrationEvents } from './rental-integration-event.mapper';

describe('toRentalIntegrationEvents', () => {
  it('translates private rental lifecycle events into versioned public integration events', () => {
    const occurredAt = new Date('2026-08-08T12:00:00.000Z');
    const periodStart = new Date('2026-09-01T09:00:00.000Z');
    const periodEnd = new Date('2026-09-03T18:00:00.000Z');
    const events = toRentalIntegrationEvents([
      new RentalConfirmedDomainEvent(
        'tenant-1',
        'rental-1',
        'customer-1',
        'branch-1',
        RentalStatus.Confirmed,
        FulfillmentMethod.Pickup,
        periodStart,
        periodEnd,
        occurredAt,
      ),
      new ConfirmedRentalEditedDomainEvent(
        'tenant-1',
        'rental-2',
        'customer-2',
        'branch-1',
        RentalStatus.Confirmed,
        FulfillmentMethod.Delivery,
        periodStart,
        periodEnd,
        occurredAt,
      ),
      new RentalCancelledDomainEvent('tenant-1', 'rental-3', null, 'branch-1', occurredAt),
    ]);

    expect(events).toEqual([
      expect.objectContaining({
        eventName: RentalConfirmedIntegrationEvent.name,
        schemaVersion: 2,
        tenantId: 'tenant-1',
        rentalId: 'rental-1',
        rentalCustomerId: 'customer-1',
        branchId: 'branch-1',
        status: 'CONFIRMED',
        fulfillmentMethod: 'PICKUP',
        periodStart,
        periodEnd,
        occurredAt,
      }),
      expect.objectContaining({
        eventName: ConfirmedRentalEditedIntegrationEvent.name,
        schemaVersion: 2,
        tenantId: 'tenant-1',
        rentalId: 'rental-2',
        rentalCustomerId: 'customer-2',
        branchId: 'branch-1',
        status: 'CONFIRMED',
        fulfillmentMethod: 'DELIVERY',
        periodStart,
        periodEnd,
        occurredAt,
      }),
      expect.objectContaining({
        eventName: RentalCancelledIntegrationEvent.name,
        schemaVersion: 2,
        tenantId: 'tenant-1',
        rentalId: 'rental-3',
        rentalCustomerId: null,
        occurredAt,
      }),
    ]);

    expect(events[2]).not.toHaveProperty('branchId');
  });
});
