export class GetCurrentRentalCustomerProfileQuery {
  constructor(
    public readonly tenantId: string,
    public readonly customerId: string,
  ) {}
}
