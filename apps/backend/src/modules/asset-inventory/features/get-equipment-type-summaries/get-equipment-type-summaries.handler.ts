import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';
import { TenantCategoryTaxonomy } from 'src/modules/tenant-management/public-api/tenant-category-taxonomy.public-api';

import { GetEquipmentTypeSummariesQuery } from './get-equipment-type-summaries.query';

export interface EquipmentTypeStockPerBranchReadModel {
  branchId: string;
  branchName: string | null;
  quantity: number;
}

export interface EquipmentTypeSummaryReadModel {
  id: string;
  name: string;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  assetsQuantity: number;
  usedAsAccessory: boolean;
  rentableItem: boolean;
  stockPerBranch: EquipmentTypeStockPerBranchReadModel[];
}

export interface GetEquipmentTypeSummariesResult {
  data: EquipmentTypeSummaryReadModel[];
  total: number;
  page: number;
  pageSize: number;
}

@QueryHandler(GetEquipmentTypeSummariesQuery)
export class GetEquipmentTypeSummariesHandler implements IQueryHandler<
  GetEquipmentTypeSummariesQuery,
  GetEquipmentTypeSummariesResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantCategoryTaxonomy: TenantCategoryTaxonomy,
  ) {}

  async execute(query: GetEquipmentTypeSummariesQuery): Promise<GetEquipmentTypeSummariesResult> {
    const where = {
      tenantId: query.tenantId,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
      ...(query.branchId
        ? {
            assets: {
              some: {
                tenantId: query.tenantId,
                branchId: query.branchId,
                status: 'ACTIVE' as const,
              },
            },
          }
        : {}),
    };

    const [equipmentTypes, total] = await this.prisma.client.$transaction([
      this.prisma.client.v2EquipmentType.findMany({
        where,
        select: {
          id: true,
          name: true,
          imageUrl: true,
          categoryId: true,
        },
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.client.v2EquipmentType.count({ where }),
    ]);

    const equipmentTypeIds = equipmentTypes.map((equipmentType) => equipmentType.id);

    if (equipmentTypeIds.length === 0) {
      return { data: [], total, page: query.page, pageSize: query.pageSize };
    }

    const [assetGroups, accessoryDefaults, rentableItems] = await this.prisma.client.$transaction([
      this.prisma.client.v2Asset.groupBy({
        by: ['equipmentTypeId', 'branchId'],
        where: {
          tenantId: query.tenantId,
          equipmentTypeId: { in: equipmentTypeIds },
          status: 'ACTIVE',
        },
        _count: { _all: true },
      }),
      this.prisma.client.v2EquipmentTypeAccessoryDefault.findMany({
        where: {
          tenantId: query.tenantId,
          accessoryEquipmentTypeId: { in: equipmentTypeIds },
        },
        select: { accessoryEquipmentTypeId: true },
        distinct: ['accessoryEquipmentTypeId'],
      }),
      this.prisma.client.v2RentableItem.findMany({
        where: {
          tenantId: query.tenantId,
          status: 'ACTIVE',
          rentalOffers: {
            some: {
              tenantId: query.tenantId,
              isRentable: true,
            },
          },
          requirements: {
            some: {
              tenantId: query.tenantId,
              equipmentTypeId: { in: equipmentTypeIds },
            },
          },
        },
        select: {
          requirements: {
            select: { equipmentTypeId: true },
          },
        },
      }),
    ]);

    const branchIds = [...new Set(assetGroups.map((group) => group.branchId))];
    const categoryIds = equipmentTypes.flatMap((equipmentType) =>
      equipmentType.categoryId ? [equipmentType.categoryId] : [],
    );
    const [branches, categories] = await Promise.all([
      this.prisma.client.v2Branch.findMany({
        where: { tenantId: query.tenantId, id: { in: branchIds }, deletedAt: null },
        select: { id: true, name: true },
      }),
      this.tenantCategoryTaxonomy.getCategoryDisplayFacts({
        tenantId: query.tenantId,
        categoryIds,
      }),
    ]);

    const branchNameById = new Map(branches.map((branch) => [branch.id, branch.name]));
    const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
    const usedAsAccessoryIds = new Set(accessoryDefaults.map((item) => item.accessoryEquipmentTypeId));
    const rentableEquipmentTypeIds = new Set<string>();
    const stockByEquipmentTypeId = new Map<string, EquipmentTypeStockPerBranchReadModel[]>();
    const assetsQuantityByEquipmentTypeId = new Map<string, number>();

    for (const rentableItem of rentableItems) {
      if (rentableItem.requirements.length !== 1) {
        continue;
      }

      const [requirement] = rentableItem.requirements;
      if (equipmentTypeIds.includes(requirement.equipmentTypeId)) {
        rentableEquipmentTypeIds.add(requirement.equipmentTypeId);
      }
    }

    for (const group of assetGroups) {
      const quantity = group._count._all;
      const stock = stockByEquipmentTypeId.get(group.equipmentTypeId) ?? [];
      stock.push({
        branchId: group.branchId,
        branchName: branchNameById.get(group.branchId) ?? null,
        quantity,
      });
      stockByEquipmentTypeId.set(group.equipmentTypeId, stock);
      assetsQuantityByEquipmentTypeId.set(
        group.equipmentTypeId,
        (assetsQuantityByEquipmentTypeId.get(group.equipmentTypeId) ?? 0) + quantity,
      );
    }

    return {
      data: equipmentTypes.map((equipmentType) => ({
        id: equipmentType.id,
        name: equipmentType.name,
        imageUrl: equipmentType.imageUrl,
        categoryId: equipmentType.categoryId,
        categoryName: equipmentType.categoryId
          ? (categoryNameById.get(equipmentType.categoryId) ?? null)
          : null,
        assetsQuantity: assetsQuantityByEquipmentTypeId.get(equipmentType.id) ?? 0,
        usedAsAccessory: usedAsAccessoryIds.has(equipmentType.id),
        rentableItem: rentableEquipmentTypeIds.has(equipmentType.id),
        stockPerBranch: (stockByEquipmentTypeId.get(equipmentType.id) ?? []).sort((left, right) =>
          (left.branchName ?? left.branchId).localeCompare(right.branchName ?? right.branchId),
        ),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
