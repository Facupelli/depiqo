import { FulfillmentMethod } from '../../domain/rental-status';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';

export type UpdateDraftRentalDeliveryIntent =
  | { type: 'KEEP_CURRENT' }
  | { type: 'NEW_DESTINATION'; address: string; locationId: string };

export type UpdateDraftRentalCommandProps = {
  tenantId: string;
  tenantUserId: string;
  rentalId: string;
  expectedVersion: number;
  branchId: string;
  rentalCustomerId?: string;
  period: RentalPeriod;
  selectedOffers: Array<{ rentalOfferId: string; quantity: number }>;
  insuranceSelected?: boolean;
  manualPricingAdjustment?: {
    mode: 'TARGET_TOTAL';
    targetTotal: string;
    reason?: string;
  };
} & (
  | { fulfillmentMethod: FulfillmentMethod.Pickup; deliveryIntent?: never }
  | { fulfillmentMethod: FulfillmentMethod.Delivery; deliveryIntent: UpdateDraftRentalDeliveryIntent }
);

export class UpdateDraftRentalCommand {
  constructor(public readonly props: UpdateDraftRentalCommandProps) {}
}
