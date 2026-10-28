import type { LocalDate } from '@repo/api-contracts';

export class RegisterExternalInvoiceCommand {
  constructor(
    public readonly props: {
      tenantId: string;
      tenantUserId: string;
      rentalId: string;
      reference: string;
      issuedOn: LocalDate;
      amount: string;
      externalUrl?: string | null;
      sourceSystem?: string | null;
    },
  ) {}
}
