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

/**
 * Maps Prisma's DateTime representation for a PostgreSQL DATE to a local-date key.
 * PostgreSQL DATE contains no timezone. UTC components avoid machine-timezone conversion.
 */
export function prismaDateToLocalDate(value: Date): LocalDate {
  const year = String(value.getUTCFullYear()).padStart(4, '0');
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Prisma requires Date for DateTime @db.Date fields. This encoding is persistence-only.
 */
export function localDateToPrismaDate(value: LocalDate): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
