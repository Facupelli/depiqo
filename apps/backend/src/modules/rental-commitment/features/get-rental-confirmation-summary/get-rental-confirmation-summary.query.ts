export class GetRentalConfirmationSummaryQuery {
  constructor(
    public readonly tenantId: string,
    public readonly rentalId: string,
  ) {}
}
