import { randomUUID } from 'crypto';
import { err, ok, Result } from 'neverthrow';

import {
  InvalidBranchScheduleDayOfWeekError,
  InvalidBranchScheduleDaySpecificationError,
  InvalidBranchScheduleTypeError,
  TenantManagementError,
} from '../errors/tenant-management.errors';
import { BranchScheduleWindow, BranchScheduleWindowProps } from '../value-objects/branch-schedule-window.value-object';

export type BranchScheduleSlotType = 'PICKUP' | 'RETURN';

export interface CreateBranchScheduleProps {
  branchId: string;
  type: string;
  dayOfWeek: number | null;
  specificDate: Date | null;
  window: BranchScheduleWindowProps;
}

export interface ReconstituteBranchScheduleProps {
  id: string;
  branchId: string;
  type: BranchScheduleSlotType;
  dayOfWeek: number | null;
  specificDate: Date | null;
  window: BranchScheduleWindowProps;
}

export class BranchSchedule {
  private constructor(
    public readonly id: string,
    public readonly branchId: string,
    public readonly type: BranchScheduleSlotType,
    public readonly dayOfWeek: number | null,
    public readonly specificDate: Date | null,
    private readonly window: BranchScheduleWindow,
  ) {}

  static create(props: CreateBranchScheduleProps): Result<BranchSchedule, TenantManagementError> {
    if (props.type !== 'PICKUP' && props.type !== 'RETURN') {
      return err(new InvalidBranchScheduleTypeError(props.type));
    }

    const daySpecification = BranchSchedule.validateDaySpecification(props.dayOfWeek, props.specificDate);
    if (daySpecification.isErr()) return err(daySpecification.error);

    if (props.dayOfWeek !== null) {
      const dayOfWeek = BranchSchedule.validateDayOfWeek(props.dayOfWeek);
      if (dayOfWeek.isErr()) return err(dayOfWeek.error);
    }

    const window = BranchScheduleWindow.create(props.window);
    if (window.isErr()) return err(window.error);

    return ok(
      new BranchSchedule(randomUUID(), props.branchId, props.type, props.dayOfWeek, props.specificDate, window.value),
    );
  }

  static reconstitute(props: ReconstituteBranchScheduleProps): BranchSchedule {
    return new BranchSchedule(
      props.id,
      props.branchId,
      props.type,
      props.dayOfWeek,
      props.specificDate,
      BranchScheduleWindow.reconstitute(props.window),
    );
  }

  getWindow(): BranchScheduleWindow {
    return this.window;
  }

  isRecurring(): boolean {
    return this.dayOfWeek !== null;
  }

  isOverride(): boolean {
    return this.specificDate !== null;
  }

  conflictsWith(other: BranchSchedule): boolean {
    if (this.type !== other.type) return false;
    if (this.isRecurring() !== other.isRecurring()) return false;
    if (this.isRecurring() && this.dayOfWeek !== other.dayOfWeek) return false;
    if (this.isOverride() && !this.isSameDate(other.specificDate!)) return false;

    return this.window.overlapsWith(other.getWindow());
  }

  private isSameDate(other: Date): boolean {
    return (
      this.specificDate!.getUTCFullYear() === other.getUTCFullYear() &&
      this.specificDate!.getUTCMonth() === other.getUTCMonth() &&
      this.specificDate!.getUTCDate() === other.getUTCDate()
    );
  }

  private static validateDaySpecification(
    dayOfWeek: number | null,
    specificDate: Date | null,
  ): Result<void, InvalidBranchScheduleDaySpecificationError> {
    const hasDayOfWeek = dayOfWeek !== null;
    const hasSpecificDate = specificDate !== null;

    if (hasDayOfWeek === hasSpecificDate) {
      return err(new InvalidBranchScheduleDaySpecificationError());
    }

    return ok(undefined);
  }

  private static validateDayOfWeek(dayOfWeek: number): Result<void, InvalidBranchScheduleDayOfWeekError> {
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return err(new InvalidBranchScheduleDayOfWeekError(dayOfWeek));
    }

    return ok(undefined);
  }
}
