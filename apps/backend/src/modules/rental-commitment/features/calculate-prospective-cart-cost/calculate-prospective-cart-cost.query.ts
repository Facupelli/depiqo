export type ProspectiveCartCostSelectedOffer = {
  rentalOfferId: string;
  quantity: number;
};

export type ProspectiveCartCostDeliveryDetails = {
  address: string;
};

export class CalculateProspectiveCartCostQuery {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly rentalPeriodStart: Date,
    public readonly rentalPeriodEnd: Date,
    public readonly selectedOffers: ProspectiveCartCostSelectedOffer[],
    public readonly insuranceSelected: boolean,
    public readonly couponCode: string | undefined,
    public readonly fulfillmentMethod: 'PICKUP' | 'DELIVERY',
    public readonly deliveryDetails?: ProspectiveCartCostDeliveryDetails,
    public readonly customerId?: string,
  ) {}
}
