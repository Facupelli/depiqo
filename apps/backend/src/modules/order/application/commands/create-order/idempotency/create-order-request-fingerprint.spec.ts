import { FulfillmentMethod } from '@repo/types';

import { CreateOrderCommand } from '../create-order.command';
import { createOrderRequestHash } from './create-order-request-fingerprint';

function makeCommand(overrides: Partial<ConstructorParameters<typeof CreateOrderCommand>[0]> = {}): CreateOrderCommand {
  return new CreateOrderCommand({
    tenantId: 'tenant-1',
    locationId: 'location-1',
    customerId: 'customer-1',
    pickupDate: '2026-03-30',
    returnDate: '2026-03-31',
    pickupTime: 600,
    returnTime: 900,
    items: [{ type: 'PRODUCT', productTypeId: 'product-1', quantity: 1 }],
    currency: 'ARS',
    insuranceSelected: false,
    fulfillmentMethod: FulfillmentMethod.PICKUP,
    ...overrides,
  });
}

describe('createOrderRequestHash', () => {
  it('produces the same hash for equivalent commands', () => {
    const first = makeCommand();
    const second = makeCommand();

    expect(createOrderRequestHash(first)).toBe(createOrderRequestHash(second));
  });

  it('does not include the idempotency key in the hash', () => {
    const first = makeCommand({ idempotencyKey: '3d75f524-ef81-46c9-97a8-8e1572b2d6a4' });
    const second = makeCommand({ idempotencyKey: 'fa77e520-1ddd-4086-9882-7f345d9f6519' });

    expect(createOrderRequestHash(first)).toBe(createOrderRequestHash(second));
  });

  it('changes the hash when top-level logical order inputs change', () => {
    const baseHash = createOrderRequestHash(makeCommand());

    expect(createOrderRequestHash(makeCommand({ tenantId: 'tenant-2' }))).not.toBe(baseHash);
    expect(createOrderRequestHash(makeCommand({ customerId: 'customer-2' }))).not.toBe(baseHash);
    expect(createOrderRequestHash(makeCommand({ locationId: 'location-2' }))).not.toBe(baseHash);
    expect(createOrderRequestHash(makeCommand({ pickupDate: '2026-04-01' }))).not.toBe(baseHash);
    expect(createOrderRequestHash(makeCommand({ returnDate: '2026-04-02' }))).not.toBe(baseHash);
    expect(createOrderRequestHash(makeCommand({ pickupTime: 660 }))).not.toBe(baseHash);
    expect(createOrderRequestHash(makeCommand({ returnTime: 960 }))).not.toBe(baseHash);
    expect(createOrderRequestHash(makeCommand({ currency: 'USD' }))).not.toBe(baseHash);
    expect(createOrderRequestHash(makeCommand({ insuranceSelected: true }))).not.toBe(baseHash);
    expect(createOrderRequestHash(makeCommand({ couponCode: 'SAVE10' }))).not.toBe(baseHash);
    expect(createOrderRequestHash(makeCommand({ fulfillmentMethod: FulfillmentMethod.DELIVERY }))).not.toBe(baseHash);
  });

  it('changes the hash when item inputs change', () => {
    const baseHash = createOrderRequestHash(makeCommand());

    expect(
      createOrderRequestHash(
        makeCommand({ items: [{ type: 'PRODUCT', productTypeId: 'product-1', quantity: 2 }] }),
      ),
    ).not.toBe(baseHash);
    expect(
      createOrderRequestHash(
        makeCommand({ items: [{ type: 'PRODUCT', productTypeId: 'product-2', quantity: 1 }] }),
      ),
    ).not.toBe(baseHash);
    expect(
      createOrderRequestHash(
        makeCommand({ items: [{ type: 'PRODUCT', productTypeId: 'product-1', quantity: 1, assetId: 'asset-1' }] }),
      ),
    ).not.toBe(baseHash);
    expect(createOrderRequestHash(makeCommand({ items: [{ type: 'BUNDLE', bundleId: 'bundle-1' }] }))).not.toBe(
      baseHash,
    );
  });

  it('normalizes undefined optional values consistently', () => {
    const implicitOptionalValues = makeCommand({
      customerId: undefined,
      items: [{ type: 'PRODUCT', productTypeId: 'product-1' }],
    });
    const explicitUndefinedOptionalValues = makeCommand({
      customerId: undefined,
      couponCode: undefined,
      deliveryRequest: undefined,
      items: [{ type: 'PRODUCT', productTypeId: 'product-1', quantity: undefined, assetId: undefined }],
    });

    expect(createOrderRequestHash(implicitOptionalValues)).toBe(createOrderRequestHash(explicitUndefinedOptionalValues));
  });

  it('normalizes undefined delivery request optional values consistently', () => {
    const implicitOptionalValues = makeCommand({
      fulfillmentMethod: FulfillmentMethod.DELIVERY,
      deliveryRequest: {
        recipientName: 'Jane Customer',
        phone: '+5491100000000',
        addressLine1: 'Main St 123',
        city: 'Buenos Aires',
        stateRegion: 'CABA',
        postalCode: '1000',
        country: 'AR',
      },
    });
    const explicitUndefinedOptionalValues = makeCommand({
      fulfillmentMethod: FulfillmentMethod.DELIVERY,
      deliveryRequest: {
        recipientName: 'Jane Customer',
        phone: '+5491100000000',
        addressLine1: 'Main St 123',
        addressLine2: undefined,
        city: 'Buenos Aires',
        stateRegion: 'CABA',
        postalCode: '1000',
        country: 'AR',
        instructions: undefined,
      },
    });

    expect(createOrderRequestHash(implicitOptionalValues)).toBe(createOrderRequestHash(explicitUndefinedOptionalValues));
  });

  it('changes the hash when delivery request details change', () => {
    const deliveryRequest = {
      recipientName: 'Jane Customer',
      phone: '+5491100000000',
      addressLine1: 'Main St 123',
      addressLine2: null,
      city: 'Buenos Aires',
      stateRegion: 'CABA',
      postalCode: '1000',
      country: 'AR',
      instructions: null,
    };

    const baseHash = createOrderRequestHash(
      makeCommand({ fulfillmentMethod: FulfillmentMethod.DELIVERY, deliveryRequest }),
    );

    expect(
      createOrderRequestHash(
        makeCommand({
          fulfillmentMethod: FulfillmentMethod.DELIVERY,
          deliveryRequest: { ...deliveryRequest, instructions: 'Ring the bell' },
        }),
      ),
    ).not.toBe(baseHash);
  });

  it('preserves item order in the hash', () => {
    const first = makeCommand({
      items: [
        { type: 'PRODUCT', productTypeId: 'product-1', quantity: 1 },
        { type: 'BUNDLE', bundleId: 'bundle-1' },
      ],
    });
    const second = makeCommand({
      items: [
        { type: 'BUNDLE', bundleId: 'bundle-1' },
        { type: 'PRODUCT', productTypeId: 'product-1', quantity: 1 },
      ],
    });

    expect(createOrderRequestHash(first)).not.toBe(createOrderRequestHash(second));
  });
});
