import { RentalDeliveryDetails } from '../../domain/rental.aggregate';
import { FulfillmentMethod } from '../../domain/rental-status';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';

export interface EditUnconfirmedRentalOfferSelectionCommand {
  rentalOfferId: string;
  quantity: number;
}

export interface EditUnconfirmedRentalManualPricingAdjustmentCommand {
  mode: 'TARGET_TOTAL';
  targetTotal: string;
  reason?: string;
}

export class EditUnconfirmedRentalCommand {
  constructor(
    public readonly props: {
      tenantId: string;
      tenantUserId: string;
      rentalId: string;
      expectedUpdatedAt: Date;
      branchId: string;
      period: RentalPeriod;
      selectedOffers: EditUnconfirmedRentalOfferSelectionCommand[];
      fulfillmentMethod: FulfillmentMethod;
      deliveryDetails?: RentalDeliveryDetails;
      notes?: string;
      insuranceSelected?: boolean;
      manualPricingAdjustment?: EditUnconfirmedRentalManualPricingAdjustmentCommand;
    },
  ) {}
}
