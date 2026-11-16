import { describe, expect, it } from 'vitest';

import {
  formatAcceptedCustomerTotalForRentalRemito,
  formatAcceptedPricingForRentalRemito,
  formatProposedRentalBudgetAmount,
} from './rental-remito-formatters';

// Intl uses a non-breaking space before the currency symbol in Spanish locales.
const normalizeSpaces = (value: string) => value.replace(/\u00a0/g, ' ');

describe('Rental document monetary precision', () => {
  it.each([
    ['56.80', '56,80 €'],
    ['57', '57,00 €'],
    ['56.01', '56,01 €'],
  ])('preserves cents for EUR %s in remitos and budgets', (amount, expected) => {
    expect(normalizeSpaces(formatAcceptedCustomerTotalForRentalRemito(amount, 'EUR'))).toBe(expected);
    expect(
      normalizeSpaces(
        formatAcceptedPricingForRentalRemito({
          total: { amount, currency: 'EUR' },
          acceptedCustomerTotal: amount,
          chargedUnits: 1,
        }),
      ),
    ).toBe(expected);
    expect(normalizeSpaces(formatProposedRentalBudgetAmount(amount, 'EUR'))).toBe(expected);
  });

  it.each([
    ['ARS', '$ 56,01'],
    ['USD', '$56.01'],
    ['INVALID', 'INVALID 56.01'],
  ])('preserves precision for %s, including the unsupported-currency fallback', (currency, expected) => {
    const formatted = normalizeSpaces(formatAcceptedCustomerTotalForRentalRemito('56.01', currency));
    expect(formatted).toBe(expected);
  });
});
