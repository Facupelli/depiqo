import type { LocalDate } from '@repo/api-contracts';

export function instantToLocalDate(instant: Date, timezone: string): LocalDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);

  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? '00';

  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function prismaDateToLocalDate(value: Date): LocalDate {
  const year = String(value.getUTCFullYear()).padStart(4, '0');
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function localDateToPrismaDate(value: LocalDate): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function localDateDayOfWeek(value: LocalDate): number {
  const [year, month, day] = value.split('-').map(Number);
  const adjustedYear = month < 3 ? year - 1 : year;
  const monthOffsets = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];

  return (
    (adjustedYear +
      Math.floor(adjustedYear / 4) -
      Math.floor(adjustedYear / 100) +
      Math.floor(adjustedYear / 400) +
      monthOffsets[month - 1] +
      day) %
    7
  );
}
