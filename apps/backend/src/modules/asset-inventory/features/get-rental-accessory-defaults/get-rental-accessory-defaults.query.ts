export class GetRentalAccessoryDefaultsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly rentalId: string,
  ) {}
}
