import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';

import { GetAssetsQuery } from './get-assets.query';

export interface GetAssetsItemReadModel {
  id: string;
  equipmentTypeId: string;
  equipmentTypeName: string;
  branchId: string;
  branchName: string | null;
  serialNumber: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'RETIRED';
  ownerId: string | null;
  ownerName: string | null;
}

export type GetAssetsResult = GetAssetsItemReadModel[];

@QueryHandler(GetAssetsQuery)
export class GetAssetsHandler implements IQueryHandler<GetAssetsQuery, GetAssetsResult> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchFacts: BranchFacts,
  ) {}

  async execute(query: GetAssetsQuery): Promise<GetAssetsResult> {
    const assets = await this.prisma.client.v2Asset.findMany({
      where: {
        tenantId: query.tenantId,
        ...(query.filters.ownerId ? { ownerId: query.filters.ownerId } : {}),
      },
      select: {
        id: true,
        equipmentTypeId: true,
        equipmentType: {
          select: { name: true },
        },
        branchId: true,
        serialNumber: true,
        status: true,
        ownerId: true,
        owner: {
          select: { name: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const branchIds = [...new Set(assets.map((asset) => asset.branchId))];
    const branchFactsResult = await this.branchFacts.getBranchFactsBatch({ tenantId: query.tenantId, branchIds });
    if (branchFactsResult.isErr()) {
      throw new Error(branchFactsResult.error.message, { cause: branchFactsResult.error });
    }

    const branchNameById = new Map(
      branchFactsResult.value
        .filter((branch) => !branch.isDeleted)
        .map((branch) => [branch.branchId, branch.displayName]),
    );

    return assets.map((asset) => ({
      id: asset.id,
      equipmentTypeId: asset.equipmentTypeId,
      equipmentTypeName: asset.equipmentType.name,
      branchId: asset.branchId,
      branchName: branchNameById.get(asset.branchId) ?? null,
      serialNumber: asset.serialNumber,
      status: asset.status,
      ownerId: asset.ownerId,
      ownerName: asset.owner?.name ?? null,
    }));
  }
}
