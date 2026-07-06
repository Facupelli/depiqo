import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

import { GetAssetSummariesQuery } from './get-asset-summaries.query';

export interface AssetSummaryOwnerReadModel {
  id: string;
  name: string;
}

export interface AssetSummaryReadModel {
  id: string;
  equipmentTypeId: string;
  branchId: string;
  serialNumber: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'RETIRED';
  owner: AssetSummaryOwnerReadModel | null;
}

export type GetAssetSummariesResult = AssetSummaryReadModel[];

@QueryHandler(GetAssetSummariesQuery)
export class GetAssetSummariesHandler implements IQueryHandler<GetAssetSummariesQuery, GetAssetSummariesResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetAssetSummariesQuery): Promise<GetAssetSummariesResult> {
    const ids = [...new Set(query.ids)];

    if (ids.length === 0) {
      return [];
    }

    return this.prisma.client.v2Asset.findMany({
      where: {
        tenantId: query.tenantId,
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        equipmentTypeId: true,
        branchId: true,
        serialNumber: true,
        status: true,
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
}
