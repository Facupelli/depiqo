import { FulfillmentMethod } from '../../domain/rental-status';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { CreateConfirmedRentalCommand } from './create-confirmed-rental.command';
import { buildConfirmationFingerprint } from './confirmation-operation-fingerprint';

function command(overrides: Partial<ConstructorParameters<typeof CreateConfirmedRentalCommand>[0]> = {}) {
  return new CreateConfirmedRentalCommand({
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    rentalCustomerId: 'customer-1',
    period: new RentalPeriod(new Date('2030-01-07T10:00:00.000Z'), new Date('2030-01-07T12:00:00.000Z')),
    selectedOffers: [{ rentalOfferId: 'offer-a', quantity: 2 }],
    fulfillmentMethod: FulfillmentMethod.Delivery,
    deliveryDetails: { address: '1 Test Street, Test City', locationId: 'location-1' },
    notes: 'call ahead',
    insuranceSelected: true,
    confirmationOperationId: '0d7f5698-1b1e-4a5c-9f3e-2b6c8d90e1a2',
    ...overrides,
  });
}

describe('buildConfirmationFingerprint', () => {
  it('is stable for the same valid Delivery intent', () => {
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

  it('normalizes equivalent rental-period instants expressed at different offsets', () => {
    const utc = command({
      period: new RentalPeriod(new Date('2030-01-07T10:00:00.000Z'), new Date('2030-01-07T12:00:00.000Z')),
    });
    const offset = command({
      period: new RentalPeriod(new Date('2030-01-07T07:00:00.000-03:00'), new Date('2030-01-07T09:00:00.000-03:00')),
    });

    expect(buildConfirmationFingerprint(utc)).toBe(buildConfirmationFingerprint(offset));
  });

  it('normalizes an absent optional insurance selection to its supported default', () => {
    const absent = command({
      fulfillmentMethod: FulfillmentMethod.Pickup,
      deliveryDetails: undefined,
      insuranceSelected: undefined,
    });
    const defaulted = command({
      fulfillmentMethod: FulfillmentMethod.Pickup,
      deliveryDetails: undefined,
      insuranceSelected: false,
    });

    expect(buildConfirmationFingerprint(absent)).toBe(buildConfirmationFingerprint(defaulted));
  });

  it.each([
    ['tenant', { tenantId: 'tenant-2' }],
    ['branch', { branchId: 'branch-2' }],
    ['rental customer', { rentalCustomerId: 'customer-2' }],
    [
      'rental period start',
      { period: new RentalPeriod(new Date('2030-01-07T11:00:00.000Z'), new Date('2030-01-07T12:00:00.000Z')) },
    ],
    [
      'rental period end',
      { period: new RentalPeriod(new Date('2030-01-07T10:00:00.000Z'), new Date('2030-01-07T13:00:00.000Z')) },
    ],
    ['selected offer', { selectedOffers: [{ rentalOfferId: 'offer-b', quantity: 2 }] }],
    ['quantity', { selectedOffers: [{ rentalOfferId: 'offer-a', quantity: 5 }] }],
    ['notes', { notes: 'different note' }],
    ['insurance selection', { insuranceSelected: false }],
  ])('changes when the %s differs', (_name, overrides) => {
    expect(buildConfirmationFingerprint(command(overrides))).not.toBe(buildConfirmationFingerprint(command()));
  });

  it('changes when fulfillment changes between valid Delivery and Pickup intent', () => {
    const delivery = command();
    const pickup = command({
      fulfillmentMethod: FulfillmentMethod.Pickup,
      deliveryDetails: undefined,
    });

    expect(buildConfirmationFingerprint(pickup)).not.toBe(buildConfirmationFingerprint(delivery));
  });

  it('changes when only the Delivery address differs', () => {
    const changedAddress = command({
      deliveryDetails: { address: '9 Other Street, Test City', locationId: 'location-1' },
    });

    expect(buildConfirmationFingerprint(changedAddress)).not.toBe(buildConfirmationFingerprint(command()));
  });

  it('changes when only the Delivery location differs', () => {
    const changedLocation = command({
      deliveryDetails: { address: '1 Test Street, Test City', locationId: 'location-2' },
    });

    expect(buildConfirmationFingerprint(changedLocation)).not.toBe(buildConfirmationFingerprint(command()));
  });
});
