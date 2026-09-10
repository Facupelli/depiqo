import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  EquipmentTypePageFacts,
  EquipmentTypePageFactsResult,
  GetEquipmentTypePageFactsInput,
} from './equipment-type-page-facts.public-api';

@Injectable()
export class EquipmentTypePageFactsService extends EquipmentTypePageFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getPage(input: GetEquipmentTypePageFactsInput): Promise<EquipmentTypePageFactsResult> {
    const where = {
      tenantId: input.tenantId,
      ...(input.search ? { name: { contains: input.search, mode: 'insensitive' as const } } : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    };

    const [equipmentTypes, total] = await this.prisma.client.$transaction([
      this.prisma.client.v2EquipmentType.findMany({
        where,
        select: { id: true, name: true, imageUrl: true, categoryId: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      this.prisma.client.v2EquipmentType.count({ where }),
    ]);

    const equipmentTypeIds = equipmentTypes.map(({ id }) => id);
    if (equipmentTypeIds.length === 0) {
      return { items: [], total, page: input.page, pageSize: input.pageSize };
    }

    const [activeGroups, selectedBranchGroups] = await Promise.all([
      this.prisma.client.v2Asset.groupBy({
        by: ['equipmentTypeId'],
        where: {
          tenantId: input.tenantId,
          equipmentTypeId: { in: equipmentTypeIds },
          status: 'ACTIVE',
        },
        _count: { _all: true },
      }),
      input.branchId
        ? this.prisma.client.v2Asset.groupBy({
            by: ['equipmentTypeId'],
            where: {
              tenantId: input.tenantId,
              equipmentTypeId: { in: equipmentTypeIds },
              branchId: input.branchId,
              status: 'ACTIVE',
            },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);

    const activeCountById = new Map(activeGroups.map((group) => [group.equipmentTypeId, group._count._all]));
    const selectedBranchCountById = new Map(
      selectedBranchGroups.map((group) => [group.equipmentTypeId, group._count._all]),
    );

    return {
      items: equipmentTypes.map((equipmentType) => ({
        ...equipmentType,
        activeUnitCount: activeCountById.get(equipmentType.id) ?? 0,
        selectedBranchUnitCount: input.branchId ? (selectedBranchCountById.get(equipmentType.id) ?? 0) : null,
      })),
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }
}
