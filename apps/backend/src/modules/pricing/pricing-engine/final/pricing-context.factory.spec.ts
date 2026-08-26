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
    weekendCountsAsOne: false,
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
  function createContext(calculationDate: Date, timezone: string) {
    return new PricingContextFactory().create({
      input: {
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        customerId: 'customer-1',
        calculationDate,
        pricingConfig: {
          timezone,
          dailyBillingPolicy: 'BILL_ANY_PARTIAL_DAY',
          weekendCountsAsOne: false,
          minimumChargedDays: 1,
        },
        rentalPeriod: { start: new Date('2026-08-11T10:00:00.000Z'), end: new Date('2026-08-12T10:00:00.000Z') },
        selections: [],
      },
      baseResult,
    });
  }

  it('derives calculationLocalDate once from the calculation instant and pricing timezone', () => {
    const calculationDate = new Date('2026-08-10T02:30:00.000Z');
    const context = createContext(calculationDate, 'America/Argentina/Buenos_Aires');

    expect(context.calculationDate).toEqual(calculationDate);
    expect(context.calculationLocalDate).toBe('2026-08-09');
    expect(context.subtotal).toEqual(Money.of('100', 'ARS'));
  });

  it('derives different branch-local eligibility dates from the same absolute instant', () => {
    const calculationDate = new Date('2026-08-10T02:30:00.000Z');

    expect(createContext(calculationDate, 'America/Argentina/Buenos_Aires').calculationLocalDate).toBe('2026-08-09');
    expect(createContext(calculationDate, 'Asia/Tokyo').calculationLocalDate).toBe('2026-08-10');
  });

  it.each([
    ['spring-forward before', '2026-03-08T06:59:00Z', '2026-03-08'],
    ['spring-forward after', '2026-03-08T07:00:00Z', '2026-03-08'],
    ['fall-back first hour', '2026-11-01T05:30:00Z', '2026-11-01'],
    ['fall-back repeated hour', '2026-11-01T06:30:00Z', '2026-11-01'],
  ])('keeps New York local dates correct at DST boundaries: %s', (_name, instant, localDate) => {
    expect(createContext(new Date(instant), 'America/New_York').calculationLocalDate).toBe(localDate);
  });
});
