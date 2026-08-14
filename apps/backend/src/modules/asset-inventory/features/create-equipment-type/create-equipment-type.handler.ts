import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { TenantCategoryTaxonomy } from '../../../tenant-management/public-api/tenant-category-taxonomy.public-api';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { TenantOperationalFacts } from 'src/modules/tenant-management/public-api/tenant-operational-facts.public-api';
import { AssetBranchReferenceValidatorService } from '../../application/services/asset-branch-reference-validator.service';
import { CreateEquipmentTypeSetupCommand } from '../create-equipment-type-setup/create-equipment-type-setup.command';
import {
  CreateEquipmentTypeSetupResult,
  CreateEquipmentTypeSetupService,
} from '../create-equipment-type-setup/create-equipment-type-setup.service';
import { CreateEquipmentTypeCommand } from './create-equipment-type.command';
import {
  CreateEquipmentTypeError,
  createEquipmentTypeError,
  mapAssetInventoryError,
  mapTenantValidationError,
} from './create-equipment-type.errors';

type OperationalSetupValidationError = { code: 'TenantUnavailable' | 'BranchUnavailable'; message: string };

async function validateOperationalSetup(
  tenantOperationalFacts: TenantOperationalFacts,
  branchFacts: BranchFacts,
  tenantId: string,
  branchIds: string[],
): Promise<Result<void, OperationalSetupValidationError>> {
  const tenant = await tenantOperationalFacts.getTenantOperationalFacts({ tenantId });
  if (tenant.isErr()) return err({ code: 'TenantUnavailable', message: tenant.error.message });
  const branches = await branchFacts.getBranchFactsBatch({ tenantId, branchIds });
  if (branches.isErr()) return err({ code: 'BranchUnavailable', message: branches.error.message });
  const unavailable = branches.value.find((branch) => !branch.isActive || branch.isDeleted);
  return unavailable
    ? err({ code: 'BranchUnavailable', message: `Branch "${unavailable.branchId}" is unavailable.` })
    : ok(undefined);
}

export type CreateEquipmentTypeServiceResult = Result<CreateEquipmentTypeSetupResult, CreateEquipmentTypeError>;

@CommandHandler(CreateEquipmentTypeCommand)
export class CreateEquipmentTypeHandler implements ICommandHandler<
  CreateEquipmentTypeCommand,
  CreateEquipmentTypeServiceResult
> {
  constructor(
    private readonly tenantCategoryTaxonomy: TenantCategoryTaxonomy,
    private readonly tenantOperationalFacts: TenantOperationalFacts,
    private readonly branchFacts: BranchFacts,
    private readonly assetBranchReferenceValidator: AssetBranchReferenceValidatorService,
    private readonly createEquipmentTypeSetupService: CreateEquipmentTypeSetupService,
  ) {}

  async execute(command: CreateEquipmentTypeCommand): Promise<CreateEquipmentTypeServiceResult> {
    const branchIds = [...new Set(command.assets.map((asset) => asset.branchId))];

    if (command.categoryId) {
      const categoryValidation = await this.tenantCategoryTaxonomy.validateCategoryAssignment({
        tenantId: command.tenantId,
        categoryId: command.categoryId,
      });
      if (categoryValidation.isErr()) {
        return err(
          createEquipmentTypeError(
            categoryValidation.error.code === 'CategoryInactive'
              ? 'asset_inventory.category_inactive'
              : 'asset_inventory.category_not_found',
            categoryValidation.error.message,
            categoryValidation.error,
            { categoryId: command.categoryId },
          ),
        );
      }
    }

    const tenantValidation = await validateOperationalSetup(
      this.tenantOperationalFacts,
      this.branchFacts,
      command.tenantId,
      branchIds,
    );
    if (tenantValidation.isErr()) {
      return err(mapTenantValidationError(tenantValidation.error));
    }

    const branchValidation = await this.assetBranchReferenceValidator.validateOperationalBranches({
      tenantId: command.tenantId,
      branchIds,
    });
    if (branchValidation.isErr()) {
      return err(mapTenantValidationError(branchValidation.error));
    }

    const equipmentTypeSetup = await this.createEquipmentTypeSetupService.execute(
      new CreateEquipmentTypeSetupCommand({
        tenantId: command.tenantId,
        name: command.name,
        description: command.description,
        categoryId: command.categoryId,
        assets: command.assets,
      }),
    );

    if (equipmentTypeSetup.isErr()) {
      return err(mapAssetInventoryError(equipmentTypeSetup.error));
    }

    return ok(equipmentTypeSetup.value);
  }
}
