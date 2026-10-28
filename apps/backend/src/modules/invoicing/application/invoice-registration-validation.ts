import { InvoiceRegistrationFieldsSchema, type LocalDate } from '@repo/api-contracts';
import type { RentalLifecycleStatus } from 'src/modules/rental-commitment/public-api/rental-lifecycle-facts.public-api';

export function validateInvoiceRegistration(input: {
  reference: string;
  issuedOn: LocalDate;
  amount: string;
  externalUrl?: string | null;
  sourceSystem?: string | null;
}) {
  return InvoiceRegistrationFieldsSchema.safeParse(input);
}

export function canRegisterInvoice(status: RentalLifecycleStatus, confirmedAt: Date | null): boolean {
  return status === 'CONFIRMED' || status === 'COMPLETED' || (status === 'CANCELLED' && confirmedAt !== null);
}
