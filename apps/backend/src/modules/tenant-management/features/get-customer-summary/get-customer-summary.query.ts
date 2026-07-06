export class GetCustomerSummaryQuery {
  constructor(
    public readonly tenantId: string,
    public readonly customerId: string,
  ) {}
}
