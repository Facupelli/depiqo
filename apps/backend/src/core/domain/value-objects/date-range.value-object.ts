import { addDaysToLocalDate, resolveLocalDateTime } from '@repo/temporal';

import { InvalidDateRangeException } from '../../exceptions/invalid-date-range.exception';

export class DateRange {
  readonly start: Date;
  readonly end: Date;

  private constructor(start: Date, end: Date) {
    this.start = start;
    this.end = end;
  }

  static create(start: Date, end: Date): DateRange {
    if (start > end) {
      throw new InvalidDateRangeException(start, end);
    }
    return new DateRange(start, end);
  }

  static fromLocalSlots(
    pickupDate: Date,
    pickupTime: number,
    returnDate: Date,
    returnTime: number,
    timezone: string,
  ): DateRange {
    return DateRange.fromLocalDateKeySlots(
      DateRange.toLocalDateKey(pickupDate, timezone),
      pickupTime,
      DateRange.toLocalDateKey(returnDate, timezone),
      returnTime,
      timezone,
    );
  }

  static fromLocalDateKeys(pickupDate: string, returnDate: string, timezone: string): DateRange {
    return DateRange.fromLocalDateKeySlots(pickupDate, 0, returnDate, 0, timezone);
  }

  static fromInclusiveLocalDateKeys(pickupDate: string, returnDate: string, timezone: string): DateRange {
    return DateRange.fromLocalDateKeySlots(pickupDate, 0, addDaysToLocalDate(returnDate, 1), 0, timezone);
  }

  static fromLocalDateKeySlots(
    pickupDate: string,
    pickupTime: number,
    returnDate: string,
    returnTime: number,
    timezone: string,
  ): DateRange {
    return DateRange.create(
      DateRange.resolveLocalDateTime(pickupDate, pickupTime, timezone),
      DateRange.resolveLocalDateTime(returnDate, returnTime, timezone),
    );
  }

  private static resolveLocalDateTime(localDate: string, minuteOfDay: number, timezone: string): Date {
    const resolution = resolveLocalDateTime({ localDate, minuteOfDay, timeZone: timezone });
    if (resolution.kind === 'nonexistent') {
      throw new RangeError(`Local date and time ${localDate} at minute ${minuteOfDay} does not exist in ${timezone}.`);
    }

    return resolution.instant;
  }

  private static toLocalDateKey(date: Date, timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const get = (type: string) => parts.find((part) => part.type === type)?.value;

    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  overlaps(other: DateRange): boolean {
    return this.start < other.end && other.start < this.end;
  }

  contains(date: Date): boolean {
    return date >= this.start && date < this.end;
  }

  equals(other: DateRange): boolean {
    return this.start.getTime() === other.start.getTime() && this.end.getTime() === other.end.getTime();
  }

  durationInMinutes(): number {
    return (this.end.getTime() - this.start.getTime()) / (1000 * 60);
  }

  durationInDays(): number {
    const ms = this.end.getTime() - this.start.getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }

  toString(): string {
    return `[${this.start.toISOString()}, ${this.end.toISOString()})`;
  }
}
