import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';

import { RentalPricingService } from './rental-pricing.service';
import { PricingInput } from './pricing-input.types';
import { AmbiguousPromotionPriorityError, InvalidPricingInputError, UnsupportedPricingCurrencyError } from '../errors/pricing.errors';

function input(prices: string[], overrides: Partial<PricingInput> = {}): PricingInput {
  return {
    tenantId: 'tenant',
    rentalPeriod: { start: new Date('2026-08-10T12:00:00Z'), end: new Date('2026-08-11T12:00:00Z') },
    pricingConfig: { timezone: 'UTC', dailyBillingPolicy: 'BILL_ANY_PARTIAL_DAY', weekendCountsAsOne: false, minimumChargedDays: 1 },
    calculationDate: new Date('2026-08-10T12:00:00Z'),
    automaticPromotions: [],
    selections: prices.map((price, index) => ({
      rentalSelectionId: `selection-${index}`,
      rentalOfferId: `offer-${index}`,
      rentableItemId: `item-${index}`,
      rentableItemName: `Item ${index}`,
      rentableItemKind: 'SINGLE',
      pricingLineKind: 'PRICEABLE_LINE',
      quantity: 1,
      ratePlan: { id: `plan-${index}`, currency: 'ARS', billingUnit: 'DAY', tiers: [{ id: `tier-${index}`, fromUnit: 1, toUnit: null, pricePerUnit: price }] },
    })),
    ...overrides,
  };
}

function promotion(id: string, priority: number, scope: string, stackable = true) {
  return {
    id, tenantId: 'tenant', name: id, activation: 'AUTOMATIC' as const,
    priority, stackable, isActive: true, effectType: 'PERCENTAGE_OFF' as const,
    effectValue: '50', scopes: [{ rentalOfferId: scope }], exclusions: [],
  };
}

describe('RentalPricingService monetary reconciliation', () => {
  const pricing = new RentalPricingService();

  it('rounds the order once and assigns the cent by stable offer identity', () => {
    const priced = pricing.calculate(input(['0.005', '0.005']));
    expect(priced.subtotal).toBe('0.01');
    expect(priced.total).toBe('0.01');
    expect(priced.lines.map((line) => [line.pricePerUnit, line.subtotal])).toEqual([
      ['0.005', '0.01'], ['0.005', '0.00'],
    ]);
    const reversed = pricing.calculate(input(['0.005', '0.005'], { selections: [...input(['0.005', '0.005']).selections].reverse() }));
    expect(Object.fromEntries(reversed.lines.map((line) => [line.rentalSelectionId, line.subtotal]))).toEqual({ 'selection-0': '0.01', 'selection-1': '0.00' });
  });

  it('keeps scoped promotion totals stable when selection ids change between preview and creation', () => {
    const original = input(['0.005', '0.005'], {
      automaticPromotions: [promotion('half', 1, 'offer-0')],
    });
    const preview = pricing.calculate(original);
    const created = pricing.calculate({
      ...original,
      selections: original.selections.map((selection, index) => ({
        ...selection,
        rentalSelectionId: `created-${1 - index}`,
      })).reverse(),
    });
    const totalsByOffer = (result: ReturnType<RentalPricingService['calculate']>) =>
      Object.fromEntries(result.lines.map((line) => [line.rentalOfferId, [line.subtotal, line.discountTotal, line.total]]));
    expect(created.total).toBe('0.00');
    expect(totalsByOffer(created)).toEqual(totalsByOffer(preview));
  });

  it('allocates tied promotion cents by offer identity, independently of selection ids', () => {
    const original = input(['0.01', '0.01'], {
      automaticPromotions: [{
        ...promotion('fixed', 1, 'offer-0'),
        effectType: 'FIXED_AMOUNT_OFF', effectValue: '0.01', scopes: [{ appliesToAll: true }],
      }],
    });
    original.selections[0].rentalSelectionId = 'z';
    original.selections[1].rentalSelectionId = 'a';
    const priced = pricing.calculate(original);
    expect(priced.lines.map((line) => [line.rentalOfferId, line.discountTotal])).toEqual([
      ['offer-0', '0.01'], ['offer-1', '0.00'],
    ]);
    expect(priced.total).toBe('0.01');
  });

  it('rejects duplicate rental offers instead of falling back to selection identity', () => {
    const original = input(['0.005', '0.005']);
    original.selections[1].rentalOfferId = original.selections[0].rentalOfferId;
    expect(() => pricing.calculate(original)).toThrow(InvalidPricingInputError);
  });

  it('retains an exact unit rate even when its payable line has multiple charged units', () => {
    const original = input(['0.005']);
    original.selections[0].quantity = 2;
    const priced = pricing.calculate(original);
    expect(priced.lines[0].pricePerUnit).toBe('0.005');
    expect(priced.lines[0].subtotal).toBe('0.01');
  });

  it('rounds each aggregate discount half-up and conserves payable cents', () => {
    const priced = pricing.calculate(input(['0.005', '0.005'], {
      automaticPromotions: [promotion('half', 1, 'offer-0')],
    }));
    expect(priced.subtotal).toBe('0.01');
    expect(priced.discountTotal).toBe('0.01');
    expect(priced.total).toBe('0.00');
    expect(priced.appliedPromotions[0].amount).toBe('0.01');
    expect(priced.lines[0].appliedAdjustments[0].amount).toBe('0.01');
  });

  it('allows disjoint stackable promotions at the same priority', () => {
    const priced = pricing.calculate(input(['0.01', '0.01'], {
      automaticPromotions: [promotion('b', 5, 'offer-1'), promotion('a', 5, 'offer-0')],
    }));
    expect(priced.discountTotal).toBe('0.02');
    expect(priced.total).toBe('0.00');
  });

  it.each([1, 3])('applies only the eligible equal-priority promotion for %i charged units', (days) => {
    const original = input(['1'], {
      automaticPromotions: [
        { ...promotion('short', 5, 'offer-0'), scopes: [{ appliesToAll: true }], minRentalUnits: 1, maxRentalUnits: 2 },
        { ...promotion('long', 5, 'offer-0'), scopes: [{ appliesToAll: true }], minRentalUnits: 3, maxRentalUnits: 5 },
      ],
    });
    original.rentalPeriod.end = new Date(original.rentalPeriod.start.getTime() + days * 24 * 60 * 60 * 1000);
    const priced = pricing.calculate(original);
    expect(priced.appliedPromotions.map((entry) => entry.promotionId)).toEqual([days === 1 ? 'short' : 'long']);
  });

  it('rejects positive overlapping equal-priority promotions rather than choosing input order', () => {
    expect(() => pricing.calculate(input(['0.01'], {
      automaticPromotions: [promotion('a', 5, 'offer-0'), promotion('b', 5, 'offer-0')],
    }))).toThrow(AmbiguousPromotionPriorityError);
  });

  it('does not let a zero-effect non-stackable promotion block a lower-priority promotion', () => {
    const tiny = { ...promotion('tiny', 10, 'offer-0', false), effectValue: '0.1' };
    const priced = pricing.calculate(input(['0.01'], {
      automaticPromotions: [tiny, promotion('half', 1, 'offer-0')],
    }));
    expect(priced.appliedPromotions.map((item) => item.promotionId)).toEqual(['half']);
    expect(priced.discountTotal).toBe('0.01');
  });

  it('conserves every line, discount, and order total across a rounded multi-line promotion', () => {
    const priced = pricing.calculate(input(['0.005', '0.015', '0.013'], {
      automaticPromotions: [{ ...promotion('all', 1, 'offer-0'), scopes: [{ appliesToAll: true }], effectValue: '33.3333' }],
    }));
    const sum = (amounts: string[]) => amounts.reduce((total, amount) => total.plus(amount), new Decimal(0));
    expect(sum(priced.lines.map((line) => line.subtotal)).toFixed(2)).toBe(priced.subtotal);
    expect(sum(priced.lines.map((line) => line.discountTotal)).toFixed(2)).toBe(priced.discountTotal);
    expect(sum(priced.lines.map((line) => line.total)).toFixed(2)).toBe(priced.total);
    expect(sum(priced.appliedPromotions.map((item) => item.amount)).toFixed(2)).toBe(priced.discountTotal);
    for (const line of priced.lines) {
      expect(new Decimal(line.subtotal).minus(line.discountTotal).toFixed(2)).toBe(line.total);
      expect(sum(line.appliedAdjustments.map((item) => item.amount)).toFixed(2)).toBe(line.discountTotal);
    }
  });

  it('retains thirty-digit fractional rates without losing a rounding cent', () => {
    const priced = pricing.calculate(input(['0.004999999999999999999999999999', '0.000000000000000000000000000001']));
    expect(priced.subtotal).toBe('0.01');
    expect(priced.lines.map((line) => line.subtotal)).toEqual(['0.01', '0.00']);
    expect(priced.lines[0].pricePerUnit).toBe('0.004999999999999999999999999999');
  });

  it('rejects unsupported currencies at calculation even if persisted input bypassed authoring', () => {
    const unsupported = input(['1']);
    unsupported.selections[0].ratePlan.currency = 'JPY';
    expect(() => pricing.calculate(unsupported)).toThrow(UnsupportedPricingCurrencyError);
  });
});
