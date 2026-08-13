import { AcceptedRentalPricing } from 'src/modules/rental-commitment/public-api/accepted-rental-pricing-facts.public-api';

export function formatLocalDate(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';

  return `${get('day')}/${get('month')}/${get('year')}`;
}

export function formatSignedTimestamp(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';

  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

export function formatAcceptedPricingForRentalRemito(pricing: AcceptedRentalPricing): string {
  return formatCurrency(Number(pricing.total.amount), pricing.total.currency);
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(resolveLocaleForCurrency(currency), {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function resolveLocaleForCurrency(currency: string): string {
  if (currency === 'ARS') return 'es-AR';
  if (currency === 'EUR') return 'es-ES';
  if (currency === 'USD') return 'en-US';

  return 'es-AR';
}
