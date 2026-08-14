import type { LocalDate } from '@repo/api-contracts';

/**
 * Converts an absolute instant to its calendar date in an IANA timezone.
 */
export function toLocalDate(calculationDate: Date, timezone: string): LocalDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(calculationDate);

  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? '00';

  return `${get('year')}-${get('month')}-${get('day')}`;
}
