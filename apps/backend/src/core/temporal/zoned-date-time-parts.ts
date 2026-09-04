import type { LocalDate } from '@repo/api-contracts';

import { localDateDayOfWeek } from './local-date';

export interface ZonedDateTimeParts {
  localDate: LocalDate;
  dayOfWeek: number;
  minuteOfDay: number;
}

export function toZonedDateTimeParts(date: Date, timeZone: string): ZonedDateTimeParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? '0');
  const hour = get('hour') === 24 ? 0 : get('hour');
  const localDate = `${String(get('year')).padStart(4, '0')}-${String(get('month')).padStart(2, '0')}-${String(
    get('day'),
  ).padStart(2, '0')}` as LocalDate;

  return {
    localDate,
    dayOfWeek: localDateDayOfWeek(localDate),
    minuteOfDay: hour * 60 + get('minute'),
  };
}
