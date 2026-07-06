import { BranchScheduleSlotType } from '../../domain/entities/branch-schedule.entity';

export interface CreateBranchScheduleCommandProps {
  type: BranchScheduleSlotType;
  dayOfWeek: number | null;
  specificDate: Date | null;
  openTime: number;
  closeTime: number;
  slotIntervalMinutes: number | null;
}

export class CreateBranchCommand {
  public readonly tenantId: string;
  public readonly name: string;
  public readonly address: string | null;
  public readonly timezone: string | null;
  public readonly supportsDelivery: boolean;
  public readonly deliveryDefaultCountry: string | null;
  public readonly deliveryDefaultStateRegion: string | null;
  public readonly deliveryDefaultCity: string | null;
  public readonly deliveryDefaultPostalCode: string | null;
  public readonly schedules: CreateBranchScheduleCommandProps[];

  constructor(props: {
    tenantId: string;
    name: string;
    address: string | null;
    timezone: string | null;
    supportsDelivery: boolean;
    deliveryDefaultCountry: string | null;
    deliveryDefaultStateRegion: string | null;
    deliveryDefaultCity: string | null;
    deliveryDefaultPostalCode: string | null;
    schedules: CreateBranchScheduleCommandProps[];
  }) {
    this.tenantId = props.tenantId;
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
