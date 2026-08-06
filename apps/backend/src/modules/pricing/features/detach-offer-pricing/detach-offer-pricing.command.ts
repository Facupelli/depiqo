export class DetachOfferPricingCommand {
  constructor(
    public readonly tenantId: string,
    public readonly rentalOfferPricingId: string,
  ) {}
}
