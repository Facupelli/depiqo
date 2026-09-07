import type { AssetStatusDto } from '@repo/api-contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';

import { getEquipmentTypeAssetsError, GetEquipmentTypeAssetsError } from './get-equipment-type-assets.errors';
import { GetEquipmentTypeAssetsQuery } from './get-equipment-type-assets.query';

export interface GetEquipmentTypeAssetsItemReadModel {
  id: string;
  serialNumber: string | null;
  notes: string | null;
  status: AssetStatusDto;
  branchId: string;
  branchName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  updatedAt: string;
}

export interface GetEquipmentTypeAssetsReadModel {
  data: GetEquipmentTypeAssetsItemReadModel[];
  total: number;
  page: number;
  pageSize: number;
}

export type GetEquipmentTypeAssetsResult = Result<GetEquipmentTypeAssetsReadModel, GetEquipmentTypeAssetsError>;

@QueryHandler(GetEquipmentTypeAssetsQuery)
export class GetEquipmentTypeAssetsHandler implements IQueryHandler<
  GetEquipmentTypeAssetsQuery,
  GetEquipmentTypeAssetsResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchFacts: BranchFacts,
  ) {}

  async execute(query: GetEquipmentTypeAssetsQuery): Promise<GetEquipmentTypeAssetsResult> {
    const equipmentType = await this.prisma.client.v2EquipmentType.findFirst({
      where: { id: query.equipmentTypeId, tenantId: query.tenantId },
      select: { id: true },
    });

    if (!equipmentType) {
      return err(
        getEquipmentTypeAssetsError(
          'asset_inventory.equipment_type_not_found',
          `Equipment type "${query.equipmentTypeId}" was not found.`,
          undefined,
          { equipmentTypeId: query.equipmentTypeId },
        ),
      );
    }

    const where = {
      tenantId: query.tenantId,
      equipmentTypeId: query.equipmentTypeId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.search
        ? {
            OR: [
              { serialNumber: { contains: query.search, mode: 'insensitive' as const } },
              { notes: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [assets, total] = await this.prisma.client.$transaction([
      this.prisma.client.v2Asset.findMany({
        where,
        select: {
          id: true,
          serialNumber: true,
          notes: true,
          status: true,
          branchId: true,
          ownerId: true,
          owner: { select: { name: true } },
          updatedAt: true,
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.client.v2Asset.count({ where }),
    ]);

    const branchIds = [...new Set(assets.map((asset) => asset.branchId))];
    const branchNameById = new Map<string, string>();

    if (branchIds.length > 0) {
      const branchFactsResult = await this.branchFacts.getBranchFactsBatch({
        tenantId: query.tenantId,
        branchIds,
      });
      if (branchFactsResult.isErr()) {
        throw new Error(branchFactsResult.error.message, { cause: branchFactsResult.error });
      }

      for (const branch of branchFactsResult.value) {
        if (!branch.isDeleted) {
          branchNameById.set(branch.branchId, branch.displayName);
        }
      }
    }

    return ok({
      data: assets.map((asset) => ({
        id: asset.id,
        serialNumber: asset.serialNumber,
        notes: asset.notes,
        status: asset.status,
        branchId: asset.branchId,
        branchName: branchNameById.get(asset.branchId) ?? null,
        ownerId: asset.ownerId,
        ownerName: asset.owner?.name ?? null,
        updatedAt: asset.updatedAt.toISOString(),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
