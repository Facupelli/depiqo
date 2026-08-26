import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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
    const branches = await this.prisma.client.v2Branch.findMany({
      where: { tenantId: query.tenantId, id: { in: branchIds }, deletedAt: null },
      select: { id: true, name: true },
    });
    const branchNameById = new Map(branches.map((branch) => [branch.id, branch.name]));

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
