import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

import { GetRentableItemSummariesQuery } from './get-rentable-item-summaries.query';

export interface RentableItemSummaryReadModel {
  id: string;
  name: string;
  kind: 'SINGLE' | 'PACKAGE' | 'KIT' | 'BUNDLE';
  imageUrl: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

export type GetRentableItemSummariesResult = RentableItemSummaryReadModel[];

@QueryHandler(GetRentableItemSummariesQuery)
export class GetRentableItemSummariesHandler implements IQueryHandler<
  GetRentableItemSummariesQuery,
  GetRentableItemSummariesResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetRentableItemSummariesQuery): Promise<GetRentableItemSummariesResult> {
    const ids = [...new Set(query.ids)];

    if (ids.length === 0) {
      return [];
    }

    return this.prisma.client.v2RentableItem.findMany({
      where: {
        tenantId: query.tenantId,
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        kind: true,
        imageUrl: true,
        status: true,
      },
    });
  }
}
