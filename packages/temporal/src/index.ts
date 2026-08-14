import { Temporal } from '@js-temporal/polyfill';

export interface ResolveLocalDateTimeInput {
  localDate: string;
  minuteOfDay: number;
  timeZone: string;
}

export type LocalDateTimeResolution =
  | { kind: 'resolved'; instant: Date }
  | { kind: 'nonexistent' };

export function addDaysToLocalDate(localDate: string, days: number): string {
  if (!Number.isInteger(days)) {
    throw new RangeError('days must be an integer.');
  }

  return Temporal.PlainDate.from(localDate).add({ days }).toString();
}

/**
 * Resolves a wall-clock time using IANA timezone rules.
 *
 * A local time in a spring-forward gap is reported as nonexistent. A local time
 * that occurs twice during a fall-back transition resolves to its earlier
 * occurrence.
 */
export function resolveLocalDateTime({
  localDate,
  minuteOfDay,
  timeZone,
}: ResolveLocalDateTimeInput): LocalDateTimeResolution {
  if (!Number.isInteger(minuteOfDay) || minuteOfDay < 0 || minuteOfDay > 1439) {
    throw new RangeError('minuteOfDay must be an integer between 0 and 1439.');
  }

  const date = Temporal.PlainDate.from(localDate);
  const localDateTime = date.toPlainDateTime({
    hour: Math.floor(minuteOfDay / 60),
    minute: minuteOfDay % 60,
  });
  const zonedDateTime = localDateTime.toZonedDateTime(timeZone, { disambiguation: 'earlier' });

  if (!zonedDateTime.toPlainDateTime().equals(localDateTime)) {
    return { kind: 'nonexistent' };
  }

  return { kind: 'resolved', instant: new Date(zonedDateTime.epochMilliseconds) };
}
