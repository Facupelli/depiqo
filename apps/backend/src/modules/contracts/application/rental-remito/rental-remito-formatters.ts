import {
  RENTAL_PRICE_SNAPSHOT_SCHEMA,
  RENTAL_PRICE_SNAPSHOT_VERSION,
  RentalPriceSnapshotV1,
} from 'src/modules/pricing/public-api/rental-price-snapshot.type';

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

export function formatCurrencyFromSnapshot(priceSnapshot: unknown): string | null {
  if (!isConfirmedRentalPriceSnapshot(priceSnapshot)) {
    return null;
  }

  const amount = Number(priceSnapshot.calculated.total);
  const currency = priceSnapshot.calculated.currency;

  if (!Number.isFinite(amount)) {
    return null;
  }

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

export function resolveBillingUnitsFromSnapshot(priceSnapshot: unknown): number | null {
  if (!isConfirmedRentalPriceSnapshot(priceSnapshot)) {
    return null;
  }

  return priceSnapshot.calculated.chargedDays;
}

function isConfirmedRentalPriceSnapshot(value: unknown): value is RentalPriceSnapshotV1 {
  return (
    typeof value === 'object' &&
    value !== null &&
    'schema' in value &&
    value.schema === RENTAL_PRICE_SNAPSHOT_SCHEMA &&
    'version' in value &&
    value.version === RENTAL_PRICE_SNAPSHOT_VERSION &&
    'pricing' in value &&
    typeof value.pricing === 'object' &&
    value.pricing !== null &&
    'currency' in value.pricing &&
    typeof value.pricing.currency === 'string' &&
    'total' in value.pricing &&
    typeof value.pricing.total === 'string' &&
    'chargedDays' in value.pricing &&
    typeof value.pricing.chargedDays === 'number'
  );
}

function resolveLocaleForCurrency(currency: string): string {
  if (currency === 'ARS') {
    return 'es-AR';
  }

  if (currency === 'EUR') {
    return 'es-ES';
  }

  if (currency === 'USD') {
    return 'en-US';
  }

  return 'es-AR';
}
