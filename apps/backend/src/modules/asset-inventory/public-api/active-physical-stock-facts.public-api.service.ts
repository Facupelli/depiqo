import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  ActivePhysicalStockCount,
  ActivePhysicalStockFacts,
  GetActivePhysicalStockCountsInput,
} from './active-physical-stock-facts.public-api';

@Injectable()
export class ActivePhysicalStockFactsService extends ActivePhysicalStockFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getActivePhysicalStockCounts(input: GetActivePhysicalStockCountsInput): Promise<ActivePhysicalStockCount[]> {
    const equipmentTypeIdsByBranchId = new Map<string, Set<string>>();

    for (const branch of input.branches) {
      const equipmentTypeIds = equipmentTypeIdsByBranchId.get(branch.branchId) ?? new Set<string>();
      for (const equipmentTypeId of branch.equipmentTypeIds) {
        equipmentTypeIds.add(equipmentTypeId);
      }
      equipmentTypeIdsByBranchId.set(branch.branchId, equipmentTypeIds);
    }

    const branchIds = [...equipmentTypeIdsByBranchId.keys()];
    const requestedStockByBranch = branchIds
      .map((branchId) => ({
        branchId,
        equipmentTypeIds: [...(equipmentTypeIdsByBranchId.get(branchId) ?? [])],
      }))
      .filter((branch) => branch.equipmentTypeIds.length > 0);

    if (requestedStockByBranch.length === 0) return [];

    const groups = await this.prisma.client.v2Asset.groupBy({
      by: ['branchId', 'equipmentTypeId'],
      where: {
        tenantId: input.tenantId,
        status: 'ACTIVE',
        OR: requestedStockByBranch.map((branch) => ({
          branchId: branch.branchId,
          equipmentTypeId: { in: branch.equipmentTypeIds },
        })),
      },
      _count: { _all: true },
    });
    const activeAssetCountByBranchAndType = new Map(
      groups.map((group) => [`${group.branchId}:${group.equipmentTypeId}`, group._count._all]),
    );

    return branchIds.flatMap((branchId) =>
      [...(equipmentTypeIdsByBranchId.get(branchId) ?? [])].map((equipmentTypeId) => ({
        branchId,
        equipmentTypeId,
        activeAssetCount: activeAssetCountByBranchAndType.get(`${branchId}:${equipmentTypeId}`) ?? 0,
      })),
    );
  }
}
