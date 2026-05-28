export type CalculateDraftRentalPriceSelectedOffer = {
  rentalOfferId: string;
  quantity: number;
};

export type CalculateDraftRentalPriceManualPricingAdjustment = {
  mode: 'TARGET_TOTAL';
  targetTotal: string;
  reason?: string;
};

export class CalculateDraftRentalPriceQuery {
  constructor(
    public readonly tenantId: string,
    public readonly tenantUserId: string,
    public readonly branchId: string,
    public readonly rentalPeriodStart: Date,
    public readonly rentalPeriodEnd: Date,
    public readonly selectedOffers: CalculateDraftRentalPriceSelectedOffer[],
    public readonly manualPricingAdjustment?: CalculateDraftRentalPriceManualPricingAdjustment,
    public readonly rentalCustomerId?: string,
  ) {}
}
