export class GetRentalContractSigningSummaryQuery {
  constructor(
    public readonly tenantId: string,
    public readonly rentalId: string,
  ) {}
}
