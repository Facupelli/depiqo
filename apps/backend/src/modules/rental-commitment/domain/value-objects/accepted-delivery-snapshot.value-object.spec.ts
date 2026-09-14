import { AcceptedDeliverySnapshot } from './accepted-delivery-snapshot.value-object';

const snapshotData = {
  schema: 'v2.accepted-delivery',
  version: 1,
  distanceMeters: 12500,
  delivery: {
    scheduledAt: '2030-01-10T10:00:00.000Z',
    serviceLevel: 'SPECIAL',
    basePrice: '20.00',
    surcharge: '5.00',
    total: '25.00',
  },
  collection: {
    scheduledAt: '2030-01-12T18:00:00.000Z',
    serviceLevel: 'NORMAL',
    basePrice: '15.00',
    surcharge: '0.00',
    total: '15.00',
  },
  currency: 'USD',
  deliveryTotal: '40.00',
  transportReservationMinutes: 45,
} as const;

describe('AcceptedDeliverySnapshot reschedule', () => {
  it('returns a validated immutable snapshot with only scheduled timestamps replaced', () => {
    const original = AcceptedDeliverySnapshot.create(snapshotData)._unsafeUnwrap();
    const deliveryScheduledAt = new Date('2030-02-01T09:00:00.000Z');
    const collectionScheduledAt = new Date('2030-02-04T17:30:00.000Z');

    const result = original.reschedule({ deliveryScheduledAt, collectionScheduledAt });

    expect(result.isOk()).toBe(true);
    const rescheduled = result._unsafeUnwrap();
    expect(rescheduled).not.toBe(original);
    expect(rescheduled.snapshot).toEqual({
      ...snapshotData,
      delivery: { ...snapshotData.delivery, scheduledAt: deliveryScheduledAt.toISOString() },
      collection: { ...snapshotData.collection, scheduledAt: collectionScheduledAt.toISOString() },
    });
    expect(original.snapshot).toEqual(snapshotData);
  });

  it('rejects invalid replacement timestamps', () => {
    const original = AcceptedDeliverySnapshot.create(snapshotData)._unsafeUnwrap();

    expect(
      original
        .reschedule({
          deliveryScheduledAt: new Date(Number.NaN),
          collectionScheduledAt: new Date('2030-02-04T17:30:00.000Z'),
        })
        .isErr(),
    ).toBe(true);
  });
});
