import { CreateConfirmedRentalCommand } from './create-confirmed-rental.command';
import { buildConfirmationFingerprint } from './confirmation-operation-fingerprint';
import { FulfillmentMethod } from '../../domain/rental-status';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';

function command(overrides: Partial<ConstructorParameters<typeof CreateConfirmedRentalCommand>[0]> = {}) {
  return new CreateConfirmedRentalCommand({
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    rentalCustomerId: 'customer-1',
    period: new RentalPeriod(new Date('2030-01-07T10:00:00.000Z'), new Date('2030-01-07T12:00:00.000Z')),
    selectedOffers: [{ rentalOfferId: 'offer-a', quantity: 2 }],
    fulfillmentMethod: FulfillmentMethod.Delivery,
    deliveryDetails: { addressLine1: '1 Test Street', city: 'Test City' },
    notes: 'call ahead',
    insuranceSelected: true,
    confirmationOperationId: '0d7f5698-1b1e-4a5c-9f3e-2b6c8d90e1a2',
    ...overrides,
  });
}

describe('buildConfirmationFingerprint', () => {
  it('is stable for equivalent input', () => {
    expect(buildConfirmationFingerprint(command())).toBe(buildConfirmationFingerprint(command()));
  });

  it('does not depend on selected-offer ordering', () => {
    const first = command({
      selectedOffers: [
        { rentalOfferId: 'offer-a', quantity: 1 },
        { rentalOfferId: 'offer-b', quantity: 3 },
      ],
    });
    const second = command({
      selectedOffers: [
        { rentalOfferId: 'offer-b', quantity: 3 },
        { rentalOfferId: 'offer-a', quantity: 1 },
      ],
    });

    expect(buildConfirmationFingerprint(first)).toBe(buildConfirmationFingerprint(second));
  });

  it('normalizes equivalent instants expressed at different offsets', () => {
    const utc = command({
      period: new RentalPeriod(new Date('2030-01-07T10:00:00.000Z'), new Date('2030-01-07T12:00:00.000Z')),
    });
    const offset = command({
      period: new RentalPeriod(new Date('2030-01-07T07:00:00.000-03:00'), new Date('2030-01-07T09:00:00.000-03:00')),
    });

    expect(buildConfirmationFingerprint(utc)).toBe(buildConfirmationFingerprint(offset));
  });

  it('normalizes defaults and absent optional fields', () => {
    const minimal = command({
      fulfillmentMethod: undefined,
      insuranceSelected: undefined,
      notes: undefined,
      deliveryDetails: undefined,
    });
    const defaulted = command({
      fulfillmentMethod: FulfillmentMethod.Pickup,
      insuranceSelected: false,
      notes: null as unknown as string,
      deliveryDetails: undefined,
    });

    expect(buildConfirmationFingerprint(minimal)).toBe(buildConfirmationFingerprint(defaulted));
  });

  it.each([
    ['tenant', { tenantId: 'tenant-2' }],
    ['branch', { branchId: 'branch-2' }],
    ['rental customer', { rentalCustomerId: 'customer-2' }],
    [
      'period start',
      { period: new RentalPeriod(new Date('2030-01-07T11:00:00.000Z'), new Date('2030-01-07T12:00:00.000Z')) },
    ],
    ['selected offer', { selectedOffers: [{ rentalOfferId: 'offer-b', quantity: 1 }] }],
    ['quantity', { selectedOffers: [{ rentalOfferId: 'offer-a', quantity: 5 }] }],
    ['fulfillment method', { fulfillmentMethod: FulfillmentMethod.Pickup }],
    ['delivery details', { deliveryDetails: { addressLine1: '9 Other Street', city: 'Test City' } }],
    ['notes', { notes: 'different note' }],
    ['insurance selection', { insuranceSelected: false }],
  ])('changes when the %s differs', (_name, overrides) => {
    expect(buildConfirmationFingerprint(command(overrides))).not.toBe(buildConfirmationFingerprint(command()));
  });
});
