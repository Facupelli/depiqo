import { describe, expect, it } from 'vitest';
import { TargetTotalAllocationService } from './target-total-allocation.service';
import { InvalidPricingInputError, UnsupportedPricingCurrencyError } from '../../../pricing-engine/errors/pricing.errors';
import { PricingTargetTotalAdjustmentService } from '../../../public-api/pricing-target-total-adjustment.service';
import { ManualPricingAdjustmentApplier } from './manual-pricing-adjustment-applier';
import { RentalPricingService } from '../../../pricing-engine/final/rental-pricing.service';

describe('target-total monetary reconciliation', () => {
  const allocator = new TargetTotalAllocationService();
  const lines = [
    { rentalSelectionId: 'a', rentalOfferId: 'offer-b', currentTotal: '0.01' },
    { rentalSelectionId: 'b', rentalOfferId: 'offer-a', currentTotal: '0.01' },
  ];

  it('canonicalizes exact cents and assigns ties by offer identity, not selection identity or input order', () => {
    const result = allocator.allocate({ currency: 'EUR', targetTotal: '0.010', lines });
    expect(result.targetTotal).toBe('0.01');
    expect(result.adjustmentTotal).toBe('0.01');
    expect(result.lines.map((line) => line.finalTotal)).toEqual(['0.00', '0.01']);
  });

  it.each(['0.00', '0.01'])('keeps public allocations stable across new selection ids with %s line weights', (currentTotal) => {
    const pricing = new PricingTargetTotalAdjustmentService();
    const originalLines = [
      { lineReference: 'a', rentalOfferId: 'offer-b', currentTotal },
      { lineReference: 'b', rentalOfferId: 'offer-a', currentTotal },
    ];
    const original = pricing.allocate({ currency: 'EUR', targetTotal: '0.01', lines: originalLines });
    const recreated = pricing.allocate({
      currency: 'EUR', targetTotal: '0.01',
      lines: originalLines.map((line, index) => ({ ...line, lineReference: `new-${1 - index}` })),
    });
    if (original.isErr()) throw original.error;
    if (recreated.isErr()) throw recreated.error;
    expect(original.value.lines.map((line) => line.finalTotal)).toEqual(['0.00', '0.01']);
    expect(recreated.value.lines.map((line) => line.finalTotal)).toEqual(['0.00', '0.01']);
    expect(recreated.value.lines.map((line) => line.lineReference)).toEqual(['new-1', 'new-0']);
  });

  it('rejects empty and duplicate offer allocation identities', () => {
    for (const rentalOfferId of ['', lines[0].rentalOfferId]) {
      expect(() => allocator.allocate({
        currency: 'EUR', targetTotal: '0.01', lines: [lines[0], { ...lines[1], rentalOfferId }],
      })).toThrow(InvalidPricingInputError);
    }
  });

  it('keeps final line charges and the manual adjustment reconciled to the payable target', () => {
    const priced = new RentalPricingService().calculate({
      tenantId: 'tenant',
      calculationDate: new Date('2026-08-10T00:00:00Z'),
      rentalPeriod: { start: new Date('2026-08-10T00:00:00Z'), end: new Date('2026-08-11T00:00:00Z') },
      pricingConfig: { timezone: 'UTC', dailyBillingPolicy: 'BILL_ANY_PARTIAL_DAY', weekendCountsAsOne: false, minimumChargedDays: 1 },
      automaticPromotions: [],
      selections: ['a', 'b'].map((id) => ({
        rentalSelectionId: id, rentalOfferId: id, rentableItemId: id, rentableItemName: id,
        rentableItemKind: 'SINGLE' as const, pricingLineKind: 'PRICEABLE_LINE' as const, quantity: 1,
        ratePlan: { id, billingUnit: 'DAY' as const, currency: 'USD', tiers: [{ id, fromUnit: 1, toUnit: null, pricePerUnit: '0.005' }] },
      })),
    });
    const result = new ManualPricingAdjustmentApplier().apply({ pricingResult: priced, targetTotalAdjustment: { targetTotal: '0.030' } });
    // Manual targets remain proportional to the existing payable breakdown;
    // a zero-charge line has zero weight while another line is payable.
    expect(result.pricingResult.lines.map((line) => line.total)).toEqual(['0.03', '0.00']);
    expect(result.pricingResult.total).toBe('0.03');
    expect(result.targetTotalAdjustment).toMatchObject({ previousTotal: '0.01', targetTotal: '0.03', adjustmentTotal: '0.02', direction: 'INCREASE' });
  });

  it('returns a typed public error for unsupported historical-currency edits', () => {
    const result = new PricingTargetTotalAdjustmentService().allocate({
      currency: 'JPY',
      targetTotal: '1.00',
      lines: [{ lineReference: 'historical-selection', rentalOfferId: 'historical-offer', currentTotal: '1.00' }],
    });
    expect(result.isErr() && result.error.code).toBe('pricing_target_total_adjustment.unsupported_currency');
  });

  it('rejects fractional cents and unsupported currencies instead of silently rounding', () => {
    expect(() => allocator.allocate({ currency: 'USD', targetTotal: '0.015', lines })).toThrow(InvalidPricingInputError);
    expect(() => allocator.allocate({ currency: 'JPY', targetTotal: '0.01', lines })).toThrow(UnsupportedPricingCurrencyError);
  });
});
