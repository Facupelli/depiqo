export class GetCustomerProfileDetailQuery {
  constructor(
    public readonly tenantId: string,
    public readonly customerId: string,
  ) {}
}
