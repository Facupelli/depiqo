export class GetBackofficeCustomerSensitiveProfileQuery {
  constructor(
    public readonly tenantId: string,
    public readonly customerId: string,
  ) {}
}
