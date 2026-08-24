import { RentalDeliveryDetails } from '../../domain/rental.aggregate';
import { FulfillmentMethod } from '../../domain/rental-status';

export interface ChangeRentalDetailsPatch {
  fulfillmentMethod?: FulfillmentMethod;
  deliveryDetails?: RentalDeliveryDetails | null;
  notes?: string | null;
  insuranceSelected?: boolean;
  manualPricingAdjustment?: { mode: 'TARGET_TOTAL'; targetTotal: string; reason?: string } | null;
}

export class ChangeRentalDetailsCommand {
  constructor(
    public readonly props: {
      tenantId: string;
      tenantUserId: string;
      rentalId: string;
      expectedVersion: number;
      patch: ChangeRentalDetailsPatch;
    },
  ) {}
}
