export class PrepareRentalRemitoForSigningQuery {
  constructor(
    public readonly tenantId: string,
    public readonly rentalId: string,
  ) {}
}
