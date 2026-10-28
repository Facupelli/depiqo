import type { LocalDate } from '@repo/api-contracts';

export class CorrectInvoiceRegistrationCommand {
  constructor(
    public readonly props: {
      tenantId: string;
      tenantUserId: string;
      invoiceId: string;
      expectedVersion: number;
      patch: {
        reference?: string;
        issuedOn?: LocalDate;
        amount?: string;
        externalUrl?: string | null;
        sourceSystem?: string | null;
      };
    },
  ) {}
}
