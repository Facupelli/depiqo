export const PAYABLE_CURRENCIES = ['ARS', 'EUR', 'USD'] as const;

export function isPayableCurrency(value: string): boolean {
  return PAYABLE_CURRENCIES.some((currency) => currency === value.trim().toUpperCase());
}
