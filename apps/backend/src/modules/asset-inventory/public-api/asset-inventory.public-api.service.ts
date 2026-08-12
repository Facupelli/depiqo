import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';

import { CreateEquipmentTypeSetupCommand } from '../features/create-equipment-type-setup/create-equipment-type-setup.command';
import { CreateEquipmentTypeSetupService } from '../features/create-equipment-type-setup/create-equipment-type-setup.service';
import {
  ActiveOwnerContractNotFoundError,
  AssetInventoryError,
  AssetOwnerNotFoundError,
  DuplicateEquipmentTypeNameError,
  EquipmentTypeNotActiveError,
  EquipmentTypeNotFoundError,
  InsufficientActiveEquipmentStockError,
  InvalidAssetFieldError,
  InvalidEquipmentTypeFieldError,
  MultipleActiveOwnerContractsError,
} from '../domain/errors/asset-inventory.errors';
import {
  AssetDisplayFact,
  AssetInventoryPublicApi,
  AssetInventoryPublicApiError,
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
    private readonly tenantManagement: TenantManagementPublicApi,
  ) {
    super();
  }

  async createEquipmentTypeSetup(
    input: CreateEquipmentTypeSetupInput,
  ): Promise<Result<CreateEquipmentTypeSetupResult, AssetInventoryPublicApiError>> {
    if (input.equipmentType.categoryId) {
      const categoryValidation = await this.tenantManagement.validateCategoryAssignment({
        tenantId: input.tenantId,
        categoryId: input.equipmentType.categoryId,
      });
      if (categoryValidation.isErr()) {
        return err({
          code: categoryValidation.error.code === 'CategoryInactive' ? 'CategoryInactive' : 'CategoryNotFound',
          message: categoryValidation.error.message,
          cause: categoryValidation.error,
          context: categoryValidation.error.context,
        });
      }
    }
    const result = await this.createEquipmentTypeSetupService.execute(
      new CreateEquipmentTypeSetupCommand({
        tenantId: input.tenantId,
        name: input.equipmentType.name,
        description: input.equipmentType.description,
        categoryId: input.equipmentType.categoryId,
        assets: input.assets,
      }),
    );

    return result.mapErr(mapAssetInventoryPublicApiError);
  }

  async validateEquipmentType(
    input: ValidateEquipmentTypeInput,
  ): Promise<Result<ValidateEquipmentTypeResult, AssetInventoryPublicApiError>> {
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
        return err(mapAssetInventoryPublicApiError(new EquipmentTypeNotFoundError(equipmentTypeId)));
      }

      if (!equipmentType.isActive) {
        return err(mapAssetInventoryPublicApiError(new EquipmentTypeNotActiveError(equipmentTypeId)));
      }
    }

    return ok({ equipmentIds });
  }

  async validatePackageRequirementsForBranches(
    input: ValidatePackageRequirementsForBranchesInput,
  ): Promise<Result<void, AssetInventoryPublicApiError>> {
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
            mapAssetInventoryPublicApiError(
              new InsufficientActiveEquipmentStockError(
                branchId,
                requirement.equipmentTypeId,
                requirement.quantityPerItem,
                activeAssetCount,
              ),
            ),
          );
        }
      }
    }

    return ok(undefined);
  }

  async getAssetDisplayFacts(input: { tenantId: string; assetIds: string[] }): Promise<AssetDisplayFact[]> {
    const assetIds = [...new Set(input.assetIds)];
    if (assetIds.length === 0) {
      return [];
    }

    const assets = await this.prisma.client.v2Asset.findMany({
      where: {
        id: { in: assetIds },
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        serialNumber: true,
      },
    });

    return assets.map((asset) => ({ assetId: asset.id, serialNumber: asset.serialNumber }));
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

function mapAssetInventoryPublicApiError(error: AssetInventoryError): AssetInventoryPublicApiError {
  if (error instanceof InvalidEquipmentTypeFieldError) {
    return publicError('InvalidEquipmentTypeField', error, { field: error.field });
  }
  if (error instanceof DuplicateEquipmentTypeNameError) {
    return publicError('DuplicateEquipmentTypeName', error, { name: error.name });
  }
  if (error instanceof InvalidAssetFieldError) {
    return publicError('InvalidAssetField', error, { field: error.field });
  }
  if (error instanceof AssetOwnerNotFoundError) {
    return publicError('AssetOwnerNotFound', error, { ownerId: error.ownerId });
  }
  if (error instanceof ActiveOwnerContractNotFoundError) {
    return publicError('ActiveOwnerContractNotFound', error, { ownerId: error.ownerId });
  }
  if (error instanceof MultipleActiveOwnerContractsError) {
    return publicError('MultipleActiveOwnerContracts', error, { ownerId: error.ownerId });
  }
  if (error instanceof EquipmentTypeNotFoundError) {
    return publicError('EquipmentTypeNotFound', error, { equipmentTypeId: error.equipmentTypeId });
  }
  if (error instanceof EquipmentTypeNotActiveError) {
    return publicError('EquipmentTypeNotActive', error, { equipmentTypeId: error.equipmentTypeId });
  }
  if (error instanceof InsufficientActiveEquipmentStockError) {
    return publicError('InsufficientActiveEquipmentStock', error, {
      branchId: error.branchId,
      equipmentTypeId: error.equipmentTypeId,
      requiredQuantity: error.requiredQuantity,
      activeAssetCount: error.activeAssetCount,
    });
  }

  throw error;
}

function publicError(
  code: AssetInventoryPublicApiError['code'],
  cause: AssetInventoryError,
  context?: Record<string, unknown>,
): AssetInventoryPublicApiError {
  return { code, message: cause.message, cause, context };
}
