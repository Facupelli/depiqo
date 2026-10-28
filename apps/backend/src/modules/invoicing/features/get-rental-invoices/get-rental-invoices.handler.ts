import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { GetRentalInvoicesResponseDto } from '@repo/api-contracts';
import { err, ok, type Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { RentalLifecycleFacts } from 'src/modules/rental-commitment/public-api/rental-lifecycle-facts.public-api';
import { invoiceSelect, toInvoiceSnapshot } from '../../persistence/invoice-snapshot';
import { getRentalInvoicesError, type GetRentalInvoicesError } from './get-rental-invoices.errors';
import { GetRentalInvoicesQuery } from './get-rental-invoices.query';

export type GetRentalInvoicesResult = Result<GetRentalInvoicesResponseDto, GetRentalInvoicesError>;

@QueryHandler(GetRentalInvoicesQuery)
export class GetRentalInvoicesHandler implements IQueryHandler<GetRentalInvoicesQuery, GetRentalInvoicesResult> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rentalLifecycleFacts: RentalLifecycleFacts,
  ) {}

  async execute(query: GetRentalInvoicesQuery): Promise<GetRentalInvoicesResult> {
    const rental = await this.rentalLifecycleFacts.getRentalLifecycleFacts({
      tenantId: query.tenantId,
      rentalId: query.rentalId,
    });
    if (rental.isErr()) {
      return err(
        getRentalInvoicesError(rental.error, {
          useCase: 'GetRentalInvoices',
          tenantId: query.tenantId,
          rentalId: query.rentalId,
        }),
      );
    }

    const invoices = await this.prisma.client.v2Invoice.findMany({
      where: {
        tenantId: query.tenantId,
        rentalId: query.rentalId,
        ...(query.includeRemoved ? {} : { removedAt: null }),
      },
      select: invoiceSelect,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return ok(invoices.map(toInvoiceSnapshot));
  }
}
