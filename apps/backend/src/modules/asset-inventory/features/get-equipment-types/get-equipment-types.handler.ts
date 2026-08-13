import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

import { GetEquipmentTypesQuery } from './get-equipment-types.query';

export interface GetEquipmentTypesItemReadModel {
  id: string;
  name: string;
  categoryId: string | null;
}

export type GetEquipmentTypesResult = GetEquipmentTypesItemReadModel[];

@QueryHandler(GetEquipmentTypesQuery)
export class GetEquipmentTypesHandler implements IQueryHandler<GetEquipmentTypesQuery, GetEquipmentTypesResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetEquipmentTypesQuery): Promise<GetEquipmentTypesResult> {
    return this.prisma.client.v2EquipmentType.findMany({
      where: {
        tenantId: query.tenantId,
        ...(query.search
          ? {
              name: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        categoryId: true,
      },
      orderBy: { name: 'asc' },
      ...(query.limit ? { take: query.limit } : {}),
    });
  }
}
