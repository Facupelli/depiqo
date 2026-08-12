import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

import { GetCategoriesQuery } from './get-categories.query';

export interface GetCategoriesItemReadModel {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export type GetCategoriesResult = GetCategoriesItemReadModel[];

@QueryHandler(GetCategoriesQuery)
export class GetCategoriesHandler implements IQueryHandler<GetCategoriesQuery, GetCategoriesResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetCategoriesQuery): Promise<GetCategoriesResult> {
    const categories = await this.prisma.client.v2Category.findMany({
      where: { tenantId: query.tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        sortOrder: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: category.createdAt.toISOString(),
    }));
  }
}
