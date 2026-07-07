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

export type RentalRemitoPricingView = {
  currency: string;
  total: string;
  chargedDays: number;
  formattedTotal: string;
};

export function resolveRentalRemitoPricingFromSnapshot(priceSnapshot: unknown): RentalRemitoPricingView | null {
  if (!isConfirmedRentalPriceSnapshot(priceSnapshot)) {
    return null;
  }

  const amount = Number(priceSnapshot.final.total);
  const currency = priceSnapshot.final.currency;

  if (!Number.isFinite(amount)) {
    return null;
  }

  return {
    currency,
    total: priceSnapshot.final.total,
    chargedDays: priceSnapshot.final.chargedDays,
    formattedTotal: formatCurrency(amount, currency),
  };
}

function isConfirmedRentalPriceSnapshot(value: unknown): value is RentalPriceSnapshotV1 {
  return (
    typeof value === 'object' &&
    value !== null &&
    'schema' in value &&
    value.schema === RENTAL_PRICE_SNAPSHOT_SCHEMA &&
    'version' in value &&
    value.version === RENTAL_PRICE_SNAPSHOT_VERSION &&
    'final' in value &&
    typeof value.final === 'object' &&
    value.final !== null &&
    'currency' in value.final &&
    typeof value.final.currency === 'string' &&
    'total' in value.final &&
    typeof value.final.total === 'string' &&
    'chargedDays' in value.final &&
    typeof value.final.chargedDays === 'number'
  );
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
