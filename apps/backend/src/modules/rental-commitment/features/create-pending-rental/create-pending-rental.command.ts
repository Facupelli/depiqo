import { FulfillmentMethod } from '../../domain/rental-status';
import { BookingSnapshot } from '../../domain/value-objects/json-snapshot.value-object';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';

export interface CreatePendingRentalEquipmentTypeSelectionCommand {
  equipmentTypeId: string;
  quantity: number;
}

export interface CreatePendingRentalComboSelectionCommand {
  comboId: string;
  quantity: number;
}

export class CreatePendingRentalCommand {
  public readonly tenantId: string;
  public readonly branchId: string;
  public readonly rentalCustomerId: string;
  public readonly period: RentalPeriod;
  public readonly selectedEquipmentTypes: CreatePendingRentalEquipmentTypeSelectionCommand[];
  public readonly selectedCombos: CreatePendingRentalComboSelectionCommand[];
  public readonly fulfillmentMethod: FulfillmentMethod;
  public readonly notes?: string;
  public readonly insuranceSelected?: boolean;
  public readonly bookingSnapshot?: BookingSnapshot;

  constructor(props: {
    tenantId: string;
    branchId: string;
    rentalCustomerId: string;
    period: RentalPeriod;
    selectedEquipmentTypes?: CreatePendingRentalEquipmentTypeSelectionCommand[];
    selectedCombos?: CreatePendingRentalComboSelectionCommand[];
    fulfillmentMethod: FulfillmentMethod;
    notes?: string;
    insuranceSelected?: boolean;
    bookingSnapshot?: BookingSnapshot;
  }) {
    this.tenantId = props.tenantId;
    this.branchId = props.branchId;
    this.rentalCustomerId = props.rentalCustomerId;
    this.period = props.period;
    this.selectedEquipmentTypes = props.selectedEquipmentTypes ?? [];
    this.selectedCombos = props.selectedCombos ?? [];
    this.fulfillmentMethod = props.fulfillmentMethod;
    this.notes = props.notes;
    this.insuranceSelected = props.insuranceSelected;
    this.bookingSnapshot = props.bookingSnapshot;
  }
}
