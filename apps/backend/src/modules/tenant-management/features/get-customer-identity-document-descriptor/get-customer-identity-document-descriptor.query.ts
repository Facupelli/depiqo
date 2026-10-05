export class GetCustomerIdentityDocumentDescriptorQuery {
  constructor(
    public readonly tenantId: string,
    public readonly customerId: string,
  ) {}
}
