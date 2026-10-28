export class RemoveInvoiceRegistrationCommand {
  constructor(
    public readonly props: {
      tenantId: string;
      tenantUserId: string;
      invoiceId: string;
      expectedVersion: number;
    },
  ) {}
}
