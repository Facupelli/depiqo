import { FulfillmentMethod } from '../../domain/rental-status';
import { BookingSnapshot } from '../../domain/value-objects/json-snapshot.value-object';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';

export interface CreateDraftRentalOfferSelectionCommand {
  rentalOfferId: string;
  quantity: number;
}

export interface CreateDraftRentalManualPricingAdjustmentCommand {
  mode: 'TARGET_TOTAL';
  targetTotal: string;
  reason?: string;
}

export interface CreateDraftRentalDeliveryDetailsCommand {
  address: string;
  locationId: string;
}

export class CreateDraftRentalCommand {
  public readonly tenantId: string;
  public readonly tenantUserId: string;
  public readonly branchId: string;
  public readonly rentalCustomerId?: string;
  public readonly period: RentalPeriod;
  public readonly selectedOffers: CreateDraftRentalOfferSelectionCommand[];
  public readonly fulfillmentMethod: FulfillmentMethod;
  public readonly notes?: string;
  public readonly insuranceSelected?: boolean;
  public readonly bookingSnapshot?: BookingSnapshot;
  public readonly deliveryDetails?: CreateDraftRentalDeliveryDetailsCommand;
  public readonly manualPricingAdjustment?: CreateDraftRentalManualPricingAdjustmentCommand;

  constructor(props: {
    tenantId: string;
    tenantUserId: string;
    branchId: string;
    rentalCustomerId?: string;
    period: RentalPeriod;
    selectedOffers?: CreateDraftRentalOfferSelectionCommand[];
    fulfillmentMethod: FulfillmentMethod;
    notes?: string;
    insuranceSelected?: boolean;
    bookingSnapshot?: BookingSnapshot;
    deliveryDetails?: CreateDraftRentalDeliveryDetailsCommand;
    manualPricingAdjustment?: CreateDraftRentalManualPricingAdjustmentCommand;
  }) {
    this.tenantId = props.tenantId;
    this.tenantUserId = props.tenantUserId;
    this.branchId = props.branchId;
    this.rentalCustomerId = props.rentalCustomerId;
    this.period = props.period;
    this.selectedOffers = props.selectedOffers ?? [];
    this.fulfillmentMethod = props.fulfillmentMethod;
    this.notes = props.notes;
    this.insuranceSelected = props.insuranceSelected;
    this.bookingSnapshot = props.bookingSnapshot;
    this.deliveryDetails = props.deliveryDetails;
    this.manualPricingAdjustment = props.manualPricingAdjustment;
  }
}
