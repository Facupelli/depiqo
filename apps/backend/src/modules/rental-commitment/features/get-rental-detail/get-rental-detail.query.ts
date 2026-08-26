export class GetRentalDetailQuery {
  constructor(
    public readonly tenantId: string,
    public readonly rentalId: string,
  ) {}
}
