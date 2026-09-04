import type { LocalDate } from '@repo/api-contracts';

import { BranchScheduleSlotType } from '../../domain/entities/branch-schedule.entity';

export interface CreateBranchScheduleCommandProps {
  type: BranchScheduleSlotType;
  dayOfWeek: number | null;
  specificDate: LocalDate | null;
  openTime: number;
  closeTime: number;
  slotIntervalMinutes: number | null;
}

export class CreateBranchCommand {
  public readonly tenantId: string;
  public readonly name: string;
  public readonly address: string | null;
  public readonly addressLocationId: string | null;
  public readonly timezone: string | null;
  public readonly schedules: CreateBranchScheduleCommandProps[];

  constructor(props: {
    tenantId: string;
    name: string;
    address: string | null;
    addressLocationId: string | null;
    timezone: string | null;
    schedules: CreateBranchScheduleCommandProps[];
  }) {
    this.tenantId = props.tenantId;
    this.name = props.name;
    this.address = props.address;
    this.addressLocationId = props.addressLocationId;
    this.timezone = props.timezone;
    this.schedules = props.schedules;
  }
}
