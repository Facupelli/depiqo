import type { UpdateDraftRentalDeliveryIntent } from '../update-draft-rental/update-draft-rental.command';

export class PreviewDraftRentalCostQuery {
  constructor(
    public readonly props: {
      tenantId: string;
      rentalId?: string;
      branchId: string;
      rentalCustomerId?: string;
      period: { start: Date; end: Date };
      selectedOffers: Array<{ rentalOfferId: string; quantity: number }>;
      targetTotalAdjustment?: { mode: 'TARGET_TOTAL'; targetTotal: string };
      insuranceSelected: boolean;
      fulfillmentMethod: 'PICKUP' | 'DELIVERY';
      deliveryIntent?:
        | UpdateDraftRentalDeliveryIntent
        | { type: 'INCOMPLETE'; arrangement: 'ROUTED' | 'STAFF_ARRANGED' };
      deliveryDecisions?: {
        pricingAgreement?: { type: 'SET'; amount: string; reason?: string } | { type: 'CLEAR' } | { type: 'KEEP' };
        transportReservationMinutes?: number;
      };
    },
  ) {}
}
