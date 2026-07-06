import { err, ok, Result } from 'neverthrow';

import { InvalidBranchScheduleWindowError } from '../errors/tenant-management.errors';

export interface BranchScheduleWindowProps {
  openTime: number;
  closeTime: number;
  slotIntervalMinutes: number | null;
}

export class BranchScheduleWindow {
  readonly openTime: number;
  readonly closeTime: number;
  readonly slotIntervalMinutes: number | null;

  private constructor(props: BranchScheduleWindowProps) {
    this.openTime = props.openTime;
    this.closeTime = props.closeTime;
    this.slotIntervalMinutes = props.slotIntervalMinutes;
  }

  static create(props: BranchScheduleWindowProps): Result<BranchScheduleWindow, InvalidBranchScheduleWindowError> {
    const validation = BranchScheduleWindow.validate(props);
    if (validation.isErr()) {
      return err(validation.error);
    }

    return ok(new BranchScheduleWindow(props));
  }

  static reconstitute(props: BranchScheduleWindowProps): BranchScheduleWindow {
    return new BranchScheduleWindow(props);
  }

  containsMinute(minute: number): boolean {
    if (this.openTime === this.closeTime) {
      return minute === this.openTime;
    }

    return minute >= this.openTime && minute < this.closeTime;
  }

  isFixedHour(): boolean {
    return this.openTime === this.closeTime;
  }

  overlapsWith(other: BranchScheduleWindow): boolean {
    const thisFixed = this.isFixedHour();
    const otherFixed = other.isFixedHour();

    if (thisFixed && otherFixed) {
      return this.openTime === other.openTime;
    }

    if (thisFixed) {
      return this.openTime >= other.openTime && this.openTime < other.closeTime;
    }

    if (otherFixed) {
      return other.openTime >= this.openTime && other.openTime < this.closeTime;
    }

    return this.openTime < other.closeTime && this.closeTime > other.openTime;
  }

  private static validate(props: BranchScheduleWindowProps): Result<void, InvalidBranchScheduleWindowError> {
    const openTimeError = BranchScheduleWindow.validateMinute(props.openTime, 'openTime');
    if (openTimeError) return err(openTimeError);

    const closeTimeError = BranchScheduleWindow.validateMinute(props.closeTime, 'closeTime');
    if (closeTimeError) return err(closeTimeError);

    if (props.openTime > props.closeTime) {
      return err(new InvalidBranchScheduleWindowError('openTime must be less than or equal to closeTime.'));
    }

    const isFixedHour = props.openTime === props.closeTime;
    const hasInterval = props.slotIntervalMinutes !== null;

    if (isFixedHour === hasInterval) {
      return err(
        new InvalidBranchScheduleWindowError(
          'slotIntervalMinutes must be null for fixed-hour schedules and present for time ranges.',
        ),
      );
    }

    if (
      props.slotIntervalMinutes !== null &&
      (!Number.isInteger(props.slotIntervalMinutes) || props.slotIntervalMinutes <= 0)
    ) {
      return err(new InvalidBranchScheduleWindowError('slotIntervalMinutes must be a positive integer.'));
    }

    return ok(undefined);
  }

  private static validateMinute(value: number, field: string): InvalidBranchScheduleWindowError | null {
    if (!Number.isInteger(value) || value < 0 || value > 1439) {
      return new InvalidBranchScheduleWindowError(`${field} must be an integer minute between 0 and 1439.`);
    }

    return null;
  }
}
