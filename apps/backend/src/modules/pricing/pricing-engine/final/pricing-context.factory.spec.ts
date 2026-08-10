import { Money } from '../money/money.value-object';
import { PricingContextFactory } from './pricing-context.factory';

const baseResult = {
  currency: 'ARS',
  subtotal: '100',
  discountTotal: '0',
  total: '100',
  chargedDays: 1,
  durationPolicySnapshot: {
    timezone: 'UTC',
    dailyBillingPolicy: 'BILL_ANY_PARTIAL_DAY' as const,
    minimumChargedDays: 1,
  },
  lines: [
    {
      rentalSelectionId: 'selection-1',
      rentalOfferId: 'offer-1',
      rentableItemId: 'item-1',
      rentableItemName: 'Item',
      quantity: 1,
      chargedUnits: 1,
      billingUnit: 'DAY' as const,
      ratePlanId: 'rate-plan-1',
      appliedTierId: 'tier-1',
      pricePerUnit: '100',
      subtotal: '100',
      discountTotal: '0',
      total: '100',
    },
  ],
};

describe('PricingContextFactory', () => {
  it('derives calculationLocalDate once from the calculation instant and pricing timezone', () => {
    const context = new PricingContextFactory().create({
      input: {
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        customerId: 'customer-1',
        calculationDate: new Date('2026-08-10T02:30:00.000Z'),
        pricingConfig: {
          timezone: 'America/Argentina/Buenos_Aires',
          dailyBillingPolicy: 'BILL_ANY_PARTIAL_DAY',
          minimumChargedDays: 1,
        },
        rentalPeriod: { start: new Date('2026-08-11T10:00:00.000Z'), end: new Date('2026-08-12T10:00:00.000Z') },
        selections: [],
      },
      baseResult,
    });

    expect(context.calculationDate).toEqual(new Date('2026-08-10T02:30:00.000Z'));
    expect(context.calculationLocalDate).toBe('2026-08-09');
    expect(context.subtotal).toEqual(Money.of('100', 'ARS'));
  });
});
