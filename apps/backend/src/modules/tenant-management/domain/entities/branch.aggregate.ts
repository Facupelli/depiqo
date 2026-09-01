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
  supportsDelivery: boolean;
  deliveryDefaultCountry: string | null;
  deliveryDefaultStateRegion: string | null;
  deliveryDefaultCity: string | null;
  deliveryDefaultPostalCode: string | null;
  schedules: Omit<CreateBranchScheduleProps, 'branchId'>[];
}

export interface UpdateBranchProps {
  name: string;
  address: string | null;
  operationalLocation: BranchOperationalLocationProps | null | undefined;
  timezone: string | null;
  supportsDelivery: boolean;
  deliveryDefaultCountry: string | null;
  deliveryDefaultStateRegion: string | null;
  deliveryDefaultCity: string | null;
  deliveryDefaultPostalCode: string | null;
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
  supportsDelivery: boolean;
  deliveryDefaultCountry: string | null;
  deliveryDefaultStateRegion: string | null;
  deliveryDefaultCity: string | null;
  deliveryDefaultPostalCode: string | null;
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
    private supportsDelivery: boolean,
    private deliveryDefaultCountry: string | null,
    private deliveryDefaultStateRegion: string | null,
    private deliveryDefaultCity: string | null,
    private deliveryDefaultPostalCode: string | null,
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
      props.supportsDelivery,
      Branch.normalizeOptionalString(props.deliveryDefaultCountry),
      Branch.normalizeOptionalString(props.deliveryDefaultStateRegion),
      Branch.normalizeOptionalString(props.deliveryDefaultCity),
      Branch.normalizeOptionalString(props.deliveryDefaultPostalCode),
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
      props.supportsDelivery,
      props.deliveryDefaultCountry,
      props.deliveryDefaultStateRegion,
      props.deliveryDefaultCity,
      props.deliveryDefaultPostalCode,
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

  get supportsDeliveryEnabled(): boolean {
    return this.supportsDelivery;
  }

  getDeliveryDefaults(): {
    country: string | null;
    stateRegion: string | null;
    city: string | null;
    postalCode: string | null;
  } {
    return {
      country: this.deliveryDefaultCountry,
      stateRegion: this.deliveryDefaultStateRegion,
      city: this.deliveryDefaultCity,
      postalCode: this.deliveryDefaultPostalCode,
    };
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
    this.supportsDelivery = props.supportsDelivery;
    this.deliveryDefaultCountry = Branch.normalizeOptionalString(props.deliveryDefaultCountry);
    this.deliveryDefaultStateRegion = Branch.normalizeOptionalString(props.deliveryDefaultStateRegion);
    this.deliveryDefaultCity = Branch.normalizeOptionalString(props.deliveryDefaultCity);
    this.deliveryDefaultPostalCode = Branch.normalizeOptionalString(props.deliveryDefaultPostalCode);
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
