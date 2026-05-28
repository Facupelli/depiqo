import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  getEquipmentTypeDetailApplicationError,
  GetEquipmentTypeDetailApplicationError,
} from './get-equipment-type-detail-application.error';
import { GetEquipmentTypeDetailQuery } from './get-equipment-type-detail.query';

export interface GetEquipmentTypeDetailAccessoryDefaultReadModel {
  id: string;
  accessoryEquipmentTypeId: string;
  accessoryEquipmentTypeName: string;
  quantity: number;
}

export interface GetEquipmentTypeDetailAssetReadModel {
  id: string;
  serialNumber: string | null;
  branchId: string;
  branchName: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'RETIRED';
  ownerId: string | null;
  ownerName: string | null;
  lastUpdate: string;
}

export interface GetEquipmentTypeDetailReadModel {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  accessoryDefaults: GetEquipmentTypeDetailAccessoryDefaultReadModel[];
  assets: GetEquipmentTypeDetailAssetReadModel[];
}

export type GetEquipmentTypeDetailResult = Result<
  GetEquipmentTypeDetailReadModel,
  GetEquipmentTypeDetailApplicationError
>;

@QueryHandler(GetEquipmentTypeDetailQuery)
export class GetEquipmentTypeDetailHandler implements IQueryHandler<
  GetEquipmentTypeDetailQuery,
  GetEquipmentTypeDetailResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetEquipmentTypeDetailQuery): Promise<GetEquipmentTypeDetailResult> {
    const equipmentType = await this.prisma.client.v2EquipmentType.findFirst({
      where: {
        id: query.equipmentTypeId,
        tenantId: query.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        accessoryDefaults: {
          select: {
            id: true,
            accessoryEquipmentTypeId: true,
            quantity: true,
            accessoryEquipmentType: {
              select: { name: true },
            },
          },
          orderBy: { accessoryEquipmentType: { name: 'asc' } },
        },
        assets: {
          where: {
            tenantId: query.tenantId,
            deletedAt: null,
          },
          select: {
            id: true,
            serialNumber: true,
            branchId: true,
            status: true,
            ownerId: true,
            updatedAt: true,
            owner: {
              select: { name: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!equipmentType) {
      return err(
        getEquipmentTypeDetailApplicationError(
          'EquipmentTypeNotFound',
          `Equipment type "${query.equipmentTypeId}" was not found.`,
        ),
      );
    }

    const branchIds = [...new Set(equipmentType.assets.map((asset) => asset.branchId))];
    const branches = await this.prisma.client.v2Branch.findMany({
      where: { tenantId: query.tenantId, id: { in: branchIds }, deletedAt: null },
      select: { id: true, name: true },
    });
    const branchNameById = new Map(branches.map((branch) => [branch.id, branch.name]));

    return ok({
      id: equipmentType.id,
      name: equipmentType.name,
      description: equipmentType.description,
      isActive: equipmentType.isActive,
      createdAt: equipmentType.createdAt.toISOString(),
      updatedAt: equipmentType.updatedAt.toISOString(),
      accessoryDefaults: equipmentType.accessoryDefaults.map((accessoryDefault) => ({
        id: accessoryDefault.id,
        accessoryEquipmentTypeId: accessoryDefault.accessoryEquipmentTypeId,
        accessoryEquipmentTypeName: accessoryDefault.accessoryEquipmentType.name,
        quantity: accessoryDefault.quantity,
      })),
      assets: equipmentType.assets.map((asset) => ({
        id: asset.id,
        serialNumber: asset.serialNumber,
        branchId: asset.branchId,
        branchName: branchNameById.get(asset.branchId) ?? null,
        status: asset.status,
        ownerId: asset.ownerId,
        ownerName: asset.owner?.name ?? null,
        lastUpdate: asset.updatedAt.toISOString(),
      })),
    });
  }
}
