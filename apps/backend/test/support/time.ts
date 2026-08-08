export type DateInterval = {
  start: Date;
  end: Date;
};

/**
 * Creates an absolute UTC timestamp from human-readable, one-based calendar components.
 */
export function utcDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): Date {
  assertIntegerInRange('year', year, 1, 9999);
  assertIntegerInRange('month', month, 1, 12);
  assertIntegerInRange('day', day, 1, daysInMonth(year, month));
  assertIntegerInRange('hour', hour, 0, 23);
  assertIntegerInRange('minute', minute, 0, 59);
  assertIntegerInRange('second', second, 0, 59);
  assertIntegerInRange('millisecond', millisecond, 0, 999);

  const timestamp = new Date(0);
  timestamp.setUTCFullYear(year, month - 1, day);
  timestamp.setUTCHours(hour, minute, second, millisecond);
  return timestamp;
}

export function oneMillisecondBefore(timestamp: Date): Date {
  return new Date(timestamp.getTime() - 1);
}

export function oneMillisecondAfter(timestamp: Date): Date {
  return new Date(timestamp.getTime() + 1);
}

/**
 * Groups timestamps without assigning interval validity, overlap, or boundary semantics.
 */
export function dateInterval(start: Date, end: Date): DateInterval {
  return { start: new Date(start), end: new Date(end) };
}

function assertIntegerInRange(name: string, value: number, minimum: number, maximum: number): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
