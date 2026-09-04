import { err, ok, Result } from 'neverthrow';

import { InvalidMinuteOfDayWindowError } from '../errors/delivery.errors';

export class MinuteOfDayWindow {
  private constructor(
    public readonly startMinute: number,
    public readonly endMinute: number,
  ) {}

  static create(
    startMinute: number,
    endMinute: number,
    field: string,
  ): Result<MinuteOfDayWindow, InvalidMinuteOfDayWindowError> {
    if (!MinuteOfDayWindow.isMinuteOfDay(startMinute) || !MinuteOfDayWindow.isMinuteOfDay(endMinute)) {
      return err(new InvalidMinuteOfDayWindowError(`${field} minutes must be integers between 0 and 1439.`));
    }

    if (startMinute >= endMinute) {
      return err(new InvalidMinuteOfDayWindowError(`${field} start minute must be before its end minute.`));
    }

    return ok(new MinuteOfDayWindow(startMinute, endMinute));
  }

  contains(other: MinuteOfDayWindow): boolean {
    return this.startMinute <= other.startMinute && this.endMinute >= other.endMinute;
  }

  containsMinute(minute: number): boolean {
    return Number.isInteger(minute) && minute >= this.startMinute && minute < this.endMinute;
  }

  private static isMinuteOfDay(value: number): boolean {
    return Number.isInteger(value) && value >= 0 && value <= 1439;
  }
}
