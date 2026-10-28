export class GetRentalInvoicesQuery {
  constructor(
    public readonly tenantId: string,
    public readonly rentalId: string,
    public readonly includeRemoved: boolean = false,
  ) {}
}
