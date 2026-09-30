import type Decimal from 'decimal.js';

export function exactRateString(value: Decimal): string {
  return value.toFixed(value.decimalPlaces());
}
