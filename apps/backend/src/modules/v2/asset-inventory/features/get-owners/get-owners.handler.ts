import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

import { GetOwnersQuery } from './get-owners.query';

export interface GetOwnersItemReadModel {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type GetOwnersResult = GetOwnersItemReadModel[];

@QueryHandler(GetOwnersQuery)
export class GetOwnersHandler implements IQueryHandler<GetOwnersQuery, GetOwnersResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetOwnersQuery): Promise<GetOwnersResult> {
    const owners = await this.prisma.client.v2AssetOwner.findMany({
      where: { tenantId: query.tenantId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return owners.map((owner) => ({
      id: owner.id,
      name: owner.name,
      createdAt: owner.createdAt.toISOString(),
      updatedAt: owner.updatedAt.toISOString(),
    }));
  }
}
