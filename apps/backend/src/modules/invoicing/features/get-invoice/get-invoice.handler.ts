import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InvoiceSchema, type GetInvoiceResponseDto } from '@repo/api-contracts';
import { err, ok, type Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { invoiceSelect, toInvoiceSnapshot } from '../../persistence/invoice-snapshot';
import { getInvoiceError, type GetInvoiceError } from './get-invoice.errors';
import { GetInvoiceQuery } from './get-invoice.query';

export type GetInvoiceResult = Result<GetInvoiceResponseDto, GetInvoiceError>;

@QueryHandler(GetInvoiceQuery)
export class GetInvoiceHandler implements IQueryHandler<GetInvoiceQuery, GetInvoiceResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetInvoiceQuery): Promise<GetInvoiceResult> {
    const invoice = await this.prisma.client.v2Invoice.findFirst({
      where: {
        id: query.invoiceId,
        tenantId: query.tenantId,
        ...(query.includeRemoved ? {} : { removedAt: null }),
      },
      select: invoiceSelect,
    });
    if (!invoice) {
      return err(getInvoiceError({ useCase: 'GetInvoice', tenantId: query.tenantId, invoiceId: query.invoiceId }));
    }

    const history = await this.prisma.client.v2InvoiceHistoryEntry.findMany({
      where: {
        tenantId: query.tenantId,
        invoiceId: query.invoiceId,
        version: { lte: invoice.version },
      },
      select: {
        id: true,
        version: true,
        action: true,
        actorTenantUserId: true,
        occurredAt: true,
        snapshot: true,
      },
      orderBy: { version: 'asc' },
    });

    return ok({
      ...toInvoiceSnapshot(invoice),
      history: history.map((entry) => ({
        id: entry.id,
        version: entry.version,
        action: entry.action,
        actorTenantUserId: entry.actorTenantUserId,
        occurredAt: entry.occurredAt.toISOString(),
        snapshot: InvoiceSchema.parse(entry.snapshot),
      })),
    });
  }
}
