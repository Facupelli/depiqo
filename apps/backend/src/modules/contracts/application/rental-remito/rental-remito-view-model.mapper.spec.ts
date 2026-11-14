import { describe, expect, it } from 'vitest';

import { RentalRemitoSourceReadModel } from './rental-remito-source-read-model';
import { RentalRemitoViewModelMapper } from './rental-remito-view-model.mapper';

function sourceWithCustomerTotal(amount: string | null): RentalRemitoSourceReadModel {
  return {
    rental: {
      id: 'rental-167',
      rentalNumber: 167,
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      customerId: 'customer-1',
      status: 'CONFIRMED',
      periodStart: new Date('2030-01-10T10:00:00.000Z'),
      periodEnd: new Date('2030-01-12T18:00:00.000Z'),
      acceptedPricing: {
        total: { amount: '31.80', currency: 'EUR' },
        acceptedCustomerTotal: amount,
        chargedUnits: 2,
      },
      insuranceSelected: true,
      confirmedAt: new Date('2030-01-01T08:00:00.000Z'),
    },
    tenant: { id: 'tenant-1', name: 'Rental', slug: 'rental', config: {}, branding: null },
    branch: { id: 'branch-1', name: 'Madrid', timezone: 'Europe/Madrid' },
    customer: {
      id: 'customer-1',
      displayName: 'Customer',
      email: null,
      phone: null,
      documentNumber: '123',
      address: null,
    },
    contractSigner: null,
    equipmentLines: [{ id: 'equipment-1', name: 'Camera', quantity: 1, serialNumbers: ['SERIAL-1'] }],
    accessoryLines: [],
  };
}

describe('RentalRemitoViewModelMapper monetary precision', () => {
  it.each([
    ['56.8000', '56,80 €'],
    ['57', '57,00 €'],
    ['56.01', '56,01 €'],
  ])('formats the accepted customer total %s without repricing or tax conversion', (amount, expected) => {
    const source = sourceWithCustomerTotal(amount);
    const original = structuredClone(source);
    const data = new RentalRemitoViewModelMapper().map(source, {})._unsafeUnwrap();

    expect(data.document.agreedPrice.replace(/\u00a0/g, ' ')).toBe(expected);
    expect(data.document.budgetPricing).toBeUndefined();
    expect(data.document.insuranceSelected).toBe(true);
    expect(data.equipmentLines).toEqual([{ name: 'Camera', quantity: 1, serialNumbers: ['SERIAL-1'] }]);
    expect(source).toEqual(original);
  });

  it('does not substitute equipment pricing when the accepted customer total is missing', () => {
    const result = new RentalRemitoViewModelMapper().map(sourceWithCustomerTotal(null), {});

    expect(result._unsafeUnwrapErr().code).toBe('PriceSnapshotInvalid');
  });
});
