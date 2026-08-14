export type CalculateDraftRentalPriceSelectedOffer = {
  rentalOfferId: string;
  quantity: number;
};

export type CalculateDraftRentalPriceTargetTotalAdjustment = {
  mode: 'TARGET_TOTAL';
  targetTotal: string;
};

export class CalculateDraftRentalPriceQuery {
  constructor(
    public readonly tenantId: string,
    public readonly tenantUserId: string,
    public readonly branchId: string,
    public readonly rentalPeriodStart: Date,
    public readonly rentalPeriodEnd: Date,
    public readonly selectedOffers: CalculateDraftRentalPriceSelectedOffer[],
    public readonly targetTotalAdjustment?: CalculateDraftRentalPriceTargetTotalAdjustment,
    public readonly rentalCustomerId?: string,
  ) {}
}
