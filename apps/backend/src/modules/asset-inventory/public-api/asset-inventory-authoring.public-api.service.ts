import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { TenantCategoryTaxonomy } from 'src/modules/tenant-management/public-api/tenant-category-taxonomy.public-api';
import { TenantOperationalFacts } from 'src/modules/tenant-management/public-api/tenant-operational-facts.public-api';

import { toAssetInventoryIntegrationEvents } from '../application/asset-inventory-integration-event.mapper';
import {
  AssetBranchReferenceValidationError,
  AssetBranchReferenceValidatorService,
} from '../application/services/asset-branch-reference-validator.service';
import { AssetCreationValidatorService } from '../application/services/asset-creation-validator.service';
import { Asset } from '../domain/asset.entity';
import { EquipmentType } from '../domain/equipment-type.entity';
import {
  ActiveOwnerContractNotFoundError,
  AssetInventoryError,
  AssetOwnerNotFoundError,
  DuplicateEquipmentTypeNameError,
  EquipmentTypeNotFoundError,
  InvalidAssetFieldError,
  InvalidEquipmentTypeFieldError,
  MultipleActiveOwnerContractsError,
} from '../domain/errors/asset-inventory.errors';
import { AssetRepository } from '../persistence/asset.repository';
import { EquipmentTypeRepository } from '../persistence/equipment-type.repository';
import {
  AssetInventoryAuthoring,
  AssetInventoryAuthoringError,
  CreateEquipmentTypeWithInitialAssetsInput,
  CreateEquipmentTypeWithInitialAssetsResult,
} from './asset-inventory-authoring.public-api';

type AssetInput = NonNullable<CreateEquipmentTypeWithInitialAssetsInput['initialAssets']>[number];

export type InventoryCreationError =
  | AssetInventoryError
  | AssetBranchReferenceValidationError
  | { code: 'TenantUnavailable' | 'CategoryNotFound' | 'CategoryInactive'; message: string };

@Injectable()
export class AssetInventoryAuthoringService extends AssetInventoryAuthoring {
  constructor(
    private readonly tenantOperationalFacts: TenantOperationalFacts,
    private readonly tenantCategoryTaxonomy: TenantCategoryTaxonomy,
    private readonly assetBranchReferenceValidator: AssetBranchReferenceValidatorService,
    private readonly assetCreationValidator: AssetCreationValidatorService,
    private readonly equipmentTypeRepository: EquipmentTypeRepository,
    private readonly assetRepository: AssetRepository,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {
    super();
  }

  async createEquipmentTypeWithInitialAssets(
    input: CreateEquipmentTypeWithInitialAssetsInput,
  ): Promise<Result<CreateEquipmentTypeWithInitialAssetsResult, AssetInventoryAuthoringError>> {
    const result = await this.createEquipmentType(input);
    return result.mapErr(mapAuthoringError);
  }

  private async createEquipmentType(
    input: CreateEquipmentTypeWithInitialAssetsInput,
  ): Promise<Result<CreateEquipmentTypeWithInitialAssetsResult, InventoryCreationError>> {
    const tenant = await this.validateTenant(input.tenantId);
    if (tenant.isErr()) return err(tenant.error);

    if (input.equipmentType.categoryId) {
      const category = await this.tenantCategoryTaxonomy.validateCategoryAssignment({
        tenantId: input.tenantId,
        categoryId: input.equipmentType.categoryId,
      });
      if (category.isErr()) return err({ code: category.error.code, message: category.error.message });
    }

    const initialAssets = input.initialAssets ?? [];
    const branches = await this.validateBranches(input.tenantId, initialAssets);
    if (branches.isErr()) return err(branches.error);

    const equipmentType = EquipmentType.create({ tenantId: input.tenantId, ...input.equipmentType });
    if (equipmentType.isErr()) return err(equipmentType.error);

    const existing = await this.equipmentTypeRepository.loadByNameForTenant({
      tenantId: equipmentType.value.tenantId,
      name: equipmentType.value.name,
    });
    if (existing) return err(new DuplicateEquipmentTypeNameError(equipmentType.value.name));

    const assets = await this.createAssets(input.tenantId, equipmentType.value.id, initialAssets);
    if (assets.isErr()) return err(assets.error);

    await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
      await this.equipmentTypeRepository.save(equipmentType.value, tx);
      await this.assetRepository.createMany(assets.value, tx);
      for (const asset of assets.value) {
        integrationEvents.collect(toAssetInventoryIntegrationEvents(asset.pullDomainEvents()));
      }
    });

    return ok({ equipmentTypeId: equipmentType.value.id, assetIds: assets.value.map((asset) => asset.id) });
  }

  // Inventory-internal operation: not exposed through the published authoring interface.
  async addAssetsToEquipmentType(input: {
    tenantId: string;
    equipmentTypeId: string;
    assets: AssetInput[];
  }): Promise<Result<{ assetIds: string[] }, InventoryCreationError>> {
    const tenant = await this.validateTenant(input.tenantId);
    if (tenant.isErr()) return err(tenant.error);

    const equipmentType = await this.equipmentTypeRepository.loadByIdForTenant(input);
    if (!equipmentType) return err(new EquipmentTypeNotFoundError(input.equipmentTypeId));

    const branches = await this.validateBranches(input.tenantId, input.assets);
    if (branches.isErr()) return err(branches.error);

    const assets = await this.createAssets(input.tenantId, equipmentType.id, input.assets);
    if (assets.isErr()) return err(assets.error);

    await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
      await this.assetRepository.createMany(assets.value, tx);
      for (const asset of assets.value) {
        integrationEvents.collect(toAssetInventoryIntegrationEvents(asset.pullDomainEvents()));
      }
    });

    return ok({ assetIds: assets.value.map((asset) => asset.id) });
  }

  private async validateTenant(tenantId: string): Promise<Result<void, InventoryCreationError>> {
    const tenant = await this.tenantOperationalFacts.getTenantOperationalFacts({ tenantId });
    return tenant.isErr() ? err({ code: 'TenantUnavailable', message: tenant.error.message }) : ok(undefined);
  }

  private validateBranches(tenantId: string, assets: AssetInput[]) {
    return this.assetBranchReferenceValidator.validateOperationalBranches({
      tenantId,
      branchIds: assets.map((asset) => asset.branchId),
    });
  }

  private async createAssets(
    tenantId: string,
    equipmentTypeId: string,
    inputs: AssetInput[],
  ): Promise<Result<Asset[], AssetInventoryError>> {
    const validation = await this.assetCreationValidator.validateAssetsCanBeCreated({ tenantId, assets: inputs });
    if (validation.isErr()) return err(validation.error);

    const assets: Asset[] = [];
    for (const input of inputs) {
      const ownerId = input.ownerId?.trim() || null;
      const asset = Asset.create({
        tenantId,
        equipmentTypeId,
        branchId: input.branchId,
        serialNumber: input.serialNumber,
        notes: input.notes,
        ownerId,
        ownerContractSnapshot: ownerId ? validation.value.ownerContractSnapshotsByOwnerId.get(ownerId) : null,
      });
      if (asset.isErr()) return err(asset.error);
      assets.push(asset.value);
    }
    return ok(assets);
  }
}

function mapAuthoringError(error: InventoryCreationError): AssetInventoryAuthoringError {
  if (!(error instanceof AssetInventoryError)) {
    if (error.code === 'TenantUnavailable') return authoringError('TenantUnavailable', error.message);
    if (error.code === 'CategoryNotFound' || error.code === 'CategoryInactive') {
      return authoringError(
        error.code,
        error.code === 'CategoryInactive'
          ? 'The category reference is inactive.'
          : 'The category reference was not found for this tenant.',
      );
    }
    if (
      error.code === 'BranchNotFound' ||
      error.code === 'BranchInactive' ||
      error.code === 'BranchDeleted' ||
      error.code === 'BranchReferenceUnavailable'
    ) {
      return mapBranchValidationError(error);
    }
    throw error;
  }
  if (error instanceof InvalidEquipmentTypeFieldError) {
    return authoringError('InvalidEquipmentTypeField', error.message, { field: error.field, reason: error.reason });
  }
  if (error instanceof DuplicateEquipmentTypeNameError) {
    return authoringError('DuplicateEquipmentTypeName', error.message, { name: error.name });
  }
  if (error instanceof InvalidAssetFieldError) {
    return authoringError('InvalidAssetField', error.message, { field: error.field, reason: error.reason });
  }
  if (error instanceof AssetOwnerNotFoundError) {
    return authoringError('AssetOwnerNotFound', error.message, { ownerId: error.ownerId });
  }
  if (error instanceof ActiveOwnerContractNotFoundError) {
    return authoringError('ActiveOwnerContractNotFound', error.message, { ownerId: error.ownerId });
  }
  if (error instanceof MultipleActiveOwnerContractsError) {
    return authoringError('MultipleActiveOwnerContracts', error.message, { ownerId: error.ownerId });
  }
  throw error;
}

function mapBranchValidationError(error: AssetBranchReferenceValidationError): AssetInventoryAuthoringError {
  if (error.code === 'BranchNotFound') {
    return authoringError(
      'BranchNotFound',
      error.branchId
        ? `Branch "${error.branchId}" was not found for this tenant.`
        : 'An initial asset branch was not found for this tenant.',
      error.branchId ? { branchId: error.branchId } : undefined,
    );
  }
  if (error.code === 'BranchInactive') {
    return authoringError('BranchInactive', `Branch "${error.branchId}" is inactive.`, { branchId: error.branchId });
  }
  if (error.code === 'BranchDeleted') {
    return authoringError('BranchDeleted', `Branch "${error.branchId}" is deleted.`, { branchId: error.branchId });
  }
  return authoringError(
    'BranchReferenceUnavailable',
    'Initial asset branch references could not be validated at this time.',
  );
}

function authoringError(
  code: AssetInventoryAuthoringError['code'],
  message: string,
  details?: AssetInventoryAuthoringError['details'],
): AssetInventoryAuthoringError {
  return { code, message, details };
}
