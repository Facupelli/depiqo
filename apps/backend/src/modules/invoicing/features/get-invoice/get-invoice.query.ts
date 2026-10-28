export class GetInvoiceQuery {
  constructor(
    public readonly tenantId: string,
    public readonly invoiceId: string,
    public readonly includeRemoved: boolean = false,
  ) {}
}
