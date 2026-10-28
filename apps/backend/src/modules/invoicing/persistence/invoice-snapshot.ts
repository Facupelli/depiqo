import type { InvoiceDto } from '@repo/api-contracts';
import { prismaDateToLocalDate } from 'src/core/temporal/local-date';
import type { Prisma } from 'src/generated/prisma/client';

export const invoiceSelect = {
  id: true,
  rentalId: true,
  origin: true,
  reference: true,
  issuedOn: true,
  amount: true,
  currency: true,
  externalUrl: true,
  sourceSystem: true,
  createdAt: true,
  createdByTenantUserId: true,
  updatedAt: true,
  updatedByTenantUserId: true,
  removedAt: true,
  removedByTenantUserId: true,
  version: true,
} satisfies Prisma.V2InvoiceSelect;

type InvoiceRecord = Prisma.V2InvoiceGetPayload<{ select: typeof invoiceSelect }>;

export function toInvoiceSnapshot(invoice: InvoiceRecord): InvoiceDto {
  return {
    id: invoice.id,
    rentalId: invoice.rentalId,
    origin: invoice.origin,
    reference: invoice.reference,
    issuedOn: prismaDateToLocalDate(invoice.issuedOn),
    amount: invoice.amount.toFixed(),
    currency: invoice.currency,
    externalUrl: invoice.externalUrl,
    sourceSystem: invoice.sourceSystem,
    createdAt: invoice.createdAt.toISOString(),
    createdByTenantUserId: invoice.createdByTenantUserId,
    updatedAt: invoice.updatedAt.toISOString(),
    updatedByTenantUserId: invoice.updatedByTenantUserId,
    removedAt: invoice.removedAt?.toISOString() ?? null,
    removedByTenantUserId: invoice.removedByTenantUserId,
    version: invoice.version,
  };
}
