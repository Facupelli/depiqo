import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

import { GetStorefrontCategoriesQuery } from './get-storefront-categories.query';

export interface GetStorefrontCategoriesItemReadModel {
  id: string;
  name: string;
}

export type GetStorefrontCategoriesResult = GetStorefrontCategoriesItemReadModel[];

@QueryHandler(GetStorefrontCategoriesQuery)
export class GetStorefrontCategoriesHandler implements IQueryHandler<
  GetStorefrontCategoriesQuery,
  GetStorefrontCategoriesResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetStorefrontCategoriesQuery): Promise<GetStorefrontCategoriesResult> {
    return this.prisma.client.v2RentableItemCategory.findMany({
      where: {
        tenantId: query.tenantId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }
}
