export type CalculateCartPriceSelectedOffer = {
  rentalOfferId: string;
  quantity: number;
};

export class CalculateCartPriceQuery {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly rentalPeriodStart: Date,
    public readonly rentalPeriodEnd: Date,
    public readonly selectedOffers: CalculateCartPriceSelectedOffer[],
    public readonly insuranceSelected: boolean,
    public readonly customerId?: string,
    public readonly couponCode?: string,
  ) {}
}
