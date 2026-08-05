import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { CreateEquipmentTypeSetupCommand } from '../features/create-equipment-type-setup/create-equipment-type-setup.command';
import { CreateEquipmentTypeSetupService } from '../features/create-equipment-type-setup/create-equipment-type-setup.service';
import {
  AssetInventoryError,
  EquipmentTypeNotActiveError,
  EquipmentTypeNotFoundError,
  InsufficientActiveEquipmentStockError,
} from '../domain/errors/asset-inventory.errors';
import {
  AssetInventoryPublicApi,
  AssetReadModel,
  CreateEquipmentTypeSetupInput,
  CreateEquipmentTypeSetupResult,
  ValidateEquipmentTypeInput,
  ValidateEquipmentTypeResult,
  ValidatePackageRequirementsForBranchesInput,
} from './asset-inventory.public-api';

@Injectable()
export class AssetInventoryPublicApiService extends AssetInventoryPublicApi {
  constructor(
    private readonly createEquipmentTypeSetupService: CreateEquipmentTypeSetupService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  createEquipmentTypeSetup(
    input: CreateEquipmentTypeSetupInput,
  ): Promise<Result<CreateEquipmentTypeSetupResult, AssetInventoryError>> {
    return this.createEquipmentTypeSetupService.execute(
      new CreateEquipmentTypeSetupCommand({
        tenantId: input.tenantId,
        name: input.equipmentType.name,
        description: input.equipmentType.description,
        assets: input.assets,
      }),
    );
  }

  async validateEquipmentType(
    input: ValidateEquipmentTypeInput,
  ): Promise<Result<ValidateEquipmentTypeResult, AssetInventoryError>> {
    const equipmentIds = [...new Set(input.equipmentIds)];

    if (equipmentIds.length === 0) {
      return ok({ equipmentIds });
    }

    const equipmentTypes = await this.prisma.client.v2EquipmentType.findMany({
      where: {
        id: { in: equipmentIds },
        tenantId: input.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });
    const equipmentTypesById = new Map(equipmentTypes.map((equipmentType) => [equipmentType.id, equipmentType]));

    for (const equipmentTypeId of equipmentIds) {
      const equipmentType = equipmentTypesById.get(equipmentTypeId);

      if (!equipmentType) {
        return err(new EquipmentTypeNotFoundError(equipmentTypeId));
      }

      if (!equipmentType.isActive) {
        return err(new EquipmentTypeNotActiveError(equipmentTypeId));
      }
    }

    return ok({ equipmentIds });
  }

  async validatePackageRequirementsForBranches(
    input: ValidatePackageRequirementsForBranchesInput,
  ): Promise<Result<void, AssetInventoryError>> {
    const equipmentTypeValidation = await this.validateEquipmentType({
      tenantId: input.tenantId,
      equipmentIds: input.requirements.map((requirement) => requirement.equipmentTypeId),
    });

    if (equipmentTypeValidation.isErr()) {
      return err(equipmentTypeValidation.error);
    }

    const branchIds = [...new Set(input.branchIds)];
    const equipmentTypeIds = equipmentTypeValidation.value.equipmentIds;
    const stockGroups = await this.prisma.client.v2Asset.groupBy({
      by: ['equipmentTypeId', 'branchId'],
      where: {
        tenantId: input.tenantId,
        branchId: { in: branchIds },
        equipmentTypeId: { in: equipmentTypeIds },
        status: 'ACTIVE',
        deletedAt: null,
      },
      _count: { _all: true },
    });
    const activeStockByEquipmentTypeAndBranch = new Map(
      stockGroups.map((group) => [`${group.equipmentTypeId}:${group.branchId}`, group._count._all]),
    );

    for (const requirement of input.requirements) {
      for (const branchId of branchIds) {
        const activeAssetCount =
          activeStockByEquipmentTypeAndBranch.get(`${requirement.equipmentTypeId}:${branchId}`) ?? 0;

        if (activeAssetCount < requirement.quantityPerItem) {
          return err(
            new InsufficientActiveEquipmentStockError(
              branchId,
              requirement.equipmentTypeId,
              requirement.quantityPerItem,
              activeAssetCount,
            ),
          );
        }
      }
    }

    return ok(undefined);
  }

  async listAssetsByEquipmentTypeAndBranch(input: {
    tenantId: string;
    equipmentTypeId: string;
    branchId: string;
  }): Promise<AssetReadModel[]> {
    return this.prisma.client.v2Asset.findMany({
      where: {
        tenantId: input.tenantId,
        equipmentTypeId: input.equipmentTypeId,
        branchId: input.branchId,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        equipmentTypeId: true,
        branchId: true,
        serialNumber: true,
        status: true,
      },
    });
  }
}
