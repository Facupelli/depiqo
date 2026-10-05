export class GetBackofficeCustomerProfileQuery {
  constructor(
    public readonly tenantId: string,
    public readonly customerId: string,
  ) {}
}
