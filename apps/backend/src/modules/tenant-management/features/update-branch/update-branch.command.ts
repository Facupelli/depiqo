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
  public readonly timezone: string | null;
  public readonly supportsDelivery: boolean;
  public readonly deliveryDefaultCountry: string | null;
  public readonly deliveryDefaultStateRegion: string | null;
  public readonly deliveryDefaultCity: string | null;
  public readonly deliveryDefaultPostalCode: string | null;
  public readonly schedules: UpdateBranchScheduleCommandProps[];

  constructor(props: {
    tenantId: string;
    branchId: string;
    name: string;
    address: string | null;
    timezone: string | null;
    supportsDelivery: boolean;
    deliveryDefaultCountry: string | null;
    deliveryDefaultStateRegion: string | null;
    deliveryDefaultCity: string | null;
    deliveryDefaultPostalCode: string | null;
    schedules: UpdateBranchScheduleCommandProps[];
  }) {
    this.tenantId = props.tenantId;
    this.branchId = props.branchId;
    this.name = props.name;
    this.address = props.address;
    this.timezone = props.timezone;
    this.supportsDelivery = props.supportsDelivery;
    this.deliveryDefaultCountry = props.deliveryDefaultCountry;
    this.deliveryDefaultStateRegion = props.deliveryDefaultStateRegion;
    this.deliveryDefaultCity = props.deliveryDefaultCity;
    this.deliveryDefaultPostalCode = props.deliveryDefaultPostalCode;
    this.schedules = props.schedules;
  }
}
