import type { LocalDate } from '@repo/api-contracts';

import { BranchScheduleSlotType } from '../../domain/entities/branch-schedule.entity';

export interface UpdateBranchScheduleCommandProps {
  type: BranchScheduleSlotType;
  dayOfWeek: number | null;
  specificDate: LocalDate | null;
  openTime: number;
  closeTime: number;
  slotIntervalMinutes: number | null;
}

export class UpdateBranchCommand {
  public readonly tenantId: string;
  public readonly branchId: string;
  public readonly name: string;
  public readonly address: string | null;
  public readonly addressLocationId: string | null;
  public readonly timezone: string | null;
  public readonly schedules: UpdateBranchScheduleCommandProps[];

  constructor(props: {
    tenantId: string;
    branchId: string;
    name: string;
    address: string | null;
    addressLocationId: string | null;
    timezone: string | null;
    schedules: UpdateBranchScheduleCommandProps[];
  }) {
    this.tenantId = props.tenantId;
    this.branchId = props.branchId;
    this.name = props.name;
    this.address = props.address;
    this.addressLocationId = props.addressLocationId;
    this.timezone = props.timezone;
    this.schedules = props.schedules;
  }
}
