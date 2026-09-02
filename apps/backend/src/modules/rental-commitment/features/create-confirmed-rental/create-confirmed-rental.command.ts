import { FulfillmentMethod } from '../../domain/rental-status';
import { BookingSnapshot } from '../../domain/value-objects/json-snapshot.value-object';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';

export interface CreateConfirmedRentalOfferSelectionCommand {
  rentalOfferId: string;
  quantity: number;
}

export interface CreateConfirmedRentalDeliveryDetailsCommand {
  address: string;
  locationId?: string;
}

export class CreateConfirmedRentalCommand {
  public readonly tenantId: string;
  public readonly branchId: string;
  public readonly rentalCustomerId: string;
  public readonly period: RentalPeriod;
  public readonly selectedOffers: CreateConfirmedRentalOfferSelectionCommand[];
  public readonly fulfillmentMethod: FulfillmentMethod;
  public readonly notes?: string;
  public readonly insuranceSelected?: boolean;
  public readonly bookingSnapshot?: BookingSnapshot;
  public readonly deliveryDetails?: CreateConfirmedRentalDeliveryDetailsCommand;
  public readonly confirmationOperationId: string;

  constructor(props: {
    tenantId: string;
    branchId: string;
    rentalCustomerId: string;
    period: RentalPeriod;
    selectedOffers?: CreateConfirmedRentalOfferSelectionCommand[];
    fulfillmentMethod: FulfillmentMethod;
    notes?: string;
    insuranceSelected?: boolean;
    bookingSnapshot?: BookingSnapshot;
    deliveryDetails?: CreateConfirmedRentalDeliveryDetailsCommand;
    confirmationOperationId: string;
  }) {
    this.tenantId = props.tenantId;
    this.branchId = props.branchId;
    this.rentalCustomerId = props.rentalCustomerId;
    this.period = props.period;
    this.selectedOffers = props.selectedOffers ?? [];
    this.fulfillmentMethod = props.fulfillmentMethod;
    this.notes = props.notes;
    this.insuranceSelected = props.insuranceSelected;
    this.bookingSnapshot = props.bookingSnapshot;
    this.deliveryDetails = props.deliveryDetails;
    this.confirmationOperationId = props.confirmationOperationId;
  }
}
