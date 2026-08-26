import { Injectable } from '@nestjs/common';
import { err, Result } from 'neverthrow';

import { TenantCategoryTaxonomy } from 'src/modules/tenant-management/public-api/tenant-category-taxonomy.public-api';

import { AssetBranchReferenceValidatorService } from '../application/services/asset-branch-reference-validator.service';
import { CreateEquipmentTypeSetupCommand } from '../features/create-equipment-type-setup/create-equipment-type-setup.command';
import { CreateEquipmentTypeSetupService } from '../features/create-equipment-type-setup/create-equipment-type-setup.service';
import {
  ActiveOwnerContractNotFoundError,
  AssetInventoryError,
  AssetOwnerNotFoundError,
  DuplicateEquipmentTypeNameError,
  InvalidAssetFieldError,
  InvalidEquipmentTypeFieldError,
  MultipleActiveOwnerContractsError,
} from '../domain/errors/asset-inventory.errors';
import {
  AssetInventoryAuthoring,
  AssetInventoryAuthoringError,
  CreateEquipmentTypeWithInitialAssetsInput,
  CreateEquipmentTypeWithInitialAssetsResult,
} from './asset-inventory-authoring.public-api';

@Injectable()
export class AssetInventoryAuthoringService extends AssetInventoryAuthoring {
  constructor(
    private readonly createEquipmentTypeSetupService: CreateEquipmentTypeSetupService,
    private readonly assetBranchReferenceValidator: AssetBranchReferenceValidatorService,
    private readonly tenantCategoryTaxonomy: TenantCategoryTaxonomy,
  ) {
    super();
  }

  async createEquipmentTypeWithInitialAssets(
    input: CreateEquipmentTypeWithInitialAssetsInput,
  ): Promise<Result<CreateEquipmentTypeWithInitialAssetsResult, AssetInventoryAuthoringError>> {
    if (input.equipmentType.categoryId) {
      const categoryValidation = await this.tenantCategoryTaxonomy.validateCategoryAssignment({
        tenantId: input.tenantId,
        categoryId: input.equipmentType.categoryId,
      });
      if (categoryValidation.isErr()) {
        return err(
          authoringError(
            categoryValidation.error.code === 'CategoryInactive' ? 'CategoryInactive' : 'CategoryNotFound',
            categoryValidation.error.code === 'CategoryInactive'
              ? 'The category reference is inactive.'
              : 'The category reference was not found for this tenant.',
          ),
        );
      }
    }

    const initialAssets = input.initialAssets ?? [];
    const branchValidation = await this.assetBranchReferenceValidator.validateOperationalBranches({
      tenantId: input.tenantId,
      branchIds: initialAssets.map((asset) => asset.branchId),
    });
    if (branchValidation.isErr()) {
      return err(mapBranchValidationError(branchValidation.error));
    }

    const result = await this.createEquipmentTypeSetupService.execute(
      new CreateEquipmentTypeSetupCommand({
        tenantId: input.tenantId,
        name: input.equipmentType.name,
        description: input.equipmentType.description,
        imageUrl: input.equipmentType.imageUrl,
        categoryId: input.equipmentType.categoryId,
        assets: initialAssets,
      }),
    );

    return result.mapErr(mapAssetInventoryAuthoringError);
  }
}

function mapBranchValidationError(error: {
  code: 'BranchNotFound' | 'BranchInactive' | 'BranchDeleted' | 'BranchReferenceUnavailable';
  branchId?: string;
}): AssetInventoryAuthoringError {
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

function mapAssetInventoryAuthoringError(error: AssetInventoryError): AssetInventoryAuthoringError {
  if (error instanceof InvalidEquipmentTypeFieldError) {
    return authoringError('InvalidEquipmentTypeField', error.message, { field: error.field });
  }
  if (error instanceof DuplicateEquipmentTypeNameError) {
    return authoringError('DuplicateEquipmentTypeName', error.message, { name: error.name });
  }
  if (error instanceof InvalidAssetFieldError) {
    return authoringError('InvalidAssetField', error.message, { field: error.field });
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

function authoringError(
  code: AssetInventoryAuthoringError['code'],
  message: string,
  details?: AssetInventoryAuthoringError['details'],
): AssetInventoryAuthoringError {
  return { code, message, details };
}
