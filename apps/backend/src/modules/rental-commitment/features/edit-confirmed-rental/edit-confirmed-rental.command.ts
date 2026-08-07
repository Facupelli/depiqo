import { RentalDeliveryDetails } from '../../domain/rental.aggregate';
import { FulfillmentMethod } from '../../domain/rental-status';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';

export interface EditConfirmedRentalOfferSelectionCommand {
  rentalOfferId: string;
  quantity: number;
}

export interface EditConfirmedRentalManualPricingAdjustmentCommand {
  mode: 'TARGET_TOTAL';
  targetTotal: string;
  reason?: string;
}

export class EditConfirmedRentalCommand {
  constructor(
    public readonly props: {
      tenantId: string;
      tenantUserId: string;
      rentalId: string;
      expectedUpdatedAt: Date;
      branchId: string;
      period: RentalPeriod;
      selectedOffers: EditConfirmedRentalOfferSelectionCommand[];
      fulfillmentMethod: FulfillmentMethod;
      deliveryDetails?: RentalDeliveryDetails;
      notes?: string;
      insuranceSelected?: boolean;
      // null explicitly retains the accepted price. A value creates a new manual adjustment.
      manualPricingAdjustment: EditConfirmedRentalManualPricingAdjustmentCommand | null;
    },
  ) {}
}
