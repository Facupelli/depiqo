import { randomUUID } from 'crypto';
import { err, ok, Result } from 'neverthrow';

import {
  BranchScheduleOverlapError,
  InvalidBranchNameError,
  TenantManagementError,
} from '../errors/tenant-management.errors';
import { assertValidIanaTimezone } from '../utils/timezone.validation';
import {
  BranchOperationalLocation,
  BranchOperationalLocationProps,
  BranchOperationalLocationValue,
} from '../value-objects/branch-operational-location.value-object';
import { BranchSchedule, CreateBranchScheduleProps } from './branch-schedule.entity';

export interface CreateBranchProps {
  tenantId: string;
  name: string;
  address: string | null;
  operationalLocation: BranchOperationalLocationProps | null;
  timezone: string | null;
  schedules: Omit<CreateBranchScheduleProps, 'branchId'>[];
}

export interface UpdateBranchProps {
  name: string;
  address: string | null;
  operationalLocation: BranchOperationalLocationProps | null | undefined;
  timezone: string | null;
  schedules: Omit<CreateBranchScheduleProps, 'branchId'>[];
}

export interface ReconstituteBranchProps {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  operationalLocation: BranchOperationalLocationValue | null;
  timezone: string | null;
  isActive: boolean;
  schedules: BranchSchedule[];
}

export class Branch {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    private name: string,
    private address: string | null,
    private operationalLocation: BranchOperationalLocation | null,
    private timezone: string | null,
    private readonly isActive: boolean,
    private schedules: BranchSchedule[],
  ) {}

  static create(props: CreateBranchProps): Result<Branch, TenantManagementError> {
    const name = props.name.trim();
    if (name.length === 0) {
      return err(new InvalidBranchNameError());
    }

    const timezone = Branch.normalizeOptionalString(props.timezone);
    if (timezone !== null) {
      try {
        assertValidIanaTimezone(timezone);
      } catch (error) {
        return err(error as TenantManagementError);
      }
    }

    const operationalLocation = props.operationalLocation
      ? BranchOperationalLocation.create(props.operationalLocation)
      : ok(null);
    if (operationalLocation.isErr()) return err(operationalLocation.error);

    const branch = new Branch(
      randomUUID(),
      props.tenantId,
      name,
      Branch.normalizeOptionalString(props.address),
      operationalLocation.value,
      timezone,
      true,
      [],
    );

    const schedules = branch.addSchedules(props.schedules);
    if (schedules.isErr()) return err(schedules.error);

    return ok(branch);
  }

  static reconstitute(props: ReconstituteBranchProps): Branch {
    return new Branch(
      props.id,
      props.tenantId,
      props.name,
      props.address,
      props.operationalLocation ? BranchOperationalLocation.reconstitute(props.operationalLocation) : null,
      props.timezone,
      props.isActive,
      props.schedules,
    );
  }

  getName(): string {
    return this.name;
  }

  getAddress(): string | null {
    return this.address;
  }

  getOperationalLocation(): BranchOperationalLocationValue | null {
    return this.operationalLocation?.toValue() ?? null;
  }

  getTimezone(): string | null {
    return this.timezone;
  }

  get active(): boolean {
    return this.isActive;
  }

  getSchedules(): readonly BranchSchedule[] {
    return this.schedules;
  }

  updateDetails(props: UpdateBranchProps): Result<void, TenantManagementError> {
    const name = props.name.trim();
    if (name.length === 0) {
      return err(new InvalidBranchNameError());
    }

    const timezone = Branch.normalizeOptionalString(props.timezone);
    if (timezone !== null) {
      try {
        assertValidIanaTimezone(timezone);
      } catch (error) {
        return err(error as TenantManagementError);
      }
    }

    const schedules = this.buildSchedules(props.schedules);
    if (schedules.isErr()) return err(schedules.error);

    let operationalLocation = this.operationalLocation;
    if (props.operationalLocation !== undefined) {
      if (props.operationalLocation === null) {
        operationalLocation = null;
      } else {
        const result = BranchOperationalLocation.create(props.operationalLocation);
        if (result.isErr()) return err(result.error);
        operationalLocation = result.value;
      }
    }

    this.name = name;
    this.address = Branch.normalizeOptionalString(props.address);
    this.operationalLocation = operationalLocation;
    this.timezone = timezone;
    this.schedules = schedules.value;

    return ok(undefined);
  }

  private addSchedules(items: Omit<CreateBranchScheduleProps, 'branchId'>[]): Result<void, TenantManagementError> {
    const schedules = this.buildSchedules(items);
    if (schedules.isErr()) return err(schedules.error);

    this.schedules.push(...schedules.value);
    return ok(undefined);
  }

  private buildSchedules(
    items: Omit<CreateBranchScheduleProps, 'branchId'>[],
  ): Result<BranchSchedule[], TenantManagementError> {
    const candidates: BranchSchedule[] = [];

    for (const item of items) {
      const schedule = BranchSchedule.create({ ...item, branchId: this.id });
      if (schedule.isErr()) return err(schedule.error);
      candidates.push(schedule.value);
    }

    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        if (candidates[i].conflictsWith(candidates[j])) {
          return err(new BranchScheduleOverlapError());
        }
      }
    }

    return ok(candidates);
  }

  private static normalizeOptionalString(value: string | null): string | null {
    return value?.trim() || null;
  }
}
