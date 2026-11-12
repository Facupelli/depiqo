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
      deliveryIntent?: { type: 'KEEP_CURRENT' } | { type: 'NEW_DESTINATION'; address: string; locationId: string };
      deliveryDecisions?: {
        pricingAgreement?: { type: 'SET'; amount: string; reason?: string } | { type: 'CLEAR' } | { type: 'KEEP' };
        transportReservationMinutes?: number;
      };
    },
  ) {}
}
