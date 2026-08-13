import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import {
  PhysicalStockSufficiency,
  PhysicalStockSufficiencyError,
} from '../../../asset-inventory/public-api/physical-stock-sufficiency.public-api';
import {
  CatalogOfferingAuthoring,
  CatalogOfferingAuthoringError,
} from '../../../catalog/public-api/catalog-offering-authoring.public-api';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { TenantOperationalFacts } from 'src/modules/tenant-management/public-api/tenant-operational-facts.public-api';
import { CreatePackageCommand } from './create-package.command';
import { CreatePackageError, createPackageError } from './create-package.errors';

export type CreatePackageServiceResult = Result<
  { rentableItemId: string; rentalOfferIds: string[] },
  CreatePackageError
>;

@CommandHandler(CreatePackageCommand)
export class CreatePackageHandler implements ICommandHandler<CreatePackageCommand, CreatePackageServiceResult> {
  constructor(
    private readonly tenantOperationalFacts: TenantOperationalFacts,
    private readonly branchFacts: BranchFacts,
    private readonly physicalStockSufficiency: PhysicalStockSufficiency,
    private readonly catalog: CatalogOfferingAuthoring,
  ) {}

  async execute(command: CreatePackageCommand): Promise<CreatePackageServiceResult> {
    const tenantValidation = await validateOperationalSetup(this.tenantOperationalFacts, this.branchFacts, command.tenantId, command.branchIds);
    if (tenantValidation.isErr()) return err(mapTenantError(tenantValidation.error));

    const equipmentValidation = await this.physicalStockSufficiency.validateActiveStockSufficiency({
      tenantId: command.tenantId,
      branchIds: command.branchIds,
      requirements: command.requirements.map((requirement) => ({
        equipmentTypeId: requirement.equipmentTypeId,
        requiredQuantity: requirement.quantityPerItem,
      })),
    });
    if (equipmentValidation.isErr()) return err(mapAssetInventoryError(equipmentValidation.error));

    const rentableItem = await this.catalog.createRentableItemOffering({
      tenantId: command.tenantId,
      name: command.name,
      description: command.description,
      imageUrl: command.imageUrl,
      categoryId: command.categoryId,
      kind: 'PACKAGE',
      requirements: command.requirements,
      branchIds: command.branchIds,
    });
    if (rentableItem.isErr()) return err(mapCatalogError(rentableItem.error));

    return ok(rentableItem.value);
  }
}

type OperationalSetupValidationError = { code: 'TenantUnavailable' | 'BranchUnavailable'; message: string };

async function validateOperationalSetup(tenantOperationalFacts: TenantOperationalFacts, branchFacts: BranchFacts, tenantId: string, branchIds: string[]): Promise<Result<void, OperationalSetupValidationError>> {
  const tenant = await tenantOperationalFacts.getTenantOperationalFacts({ tenantId });
  if (tenant.isErr()) return err({ code: 'TenantUnavailable', message: tenant.error.message });
  const branches = await branchFacts.getBranchFactsBatch({ tenantId, branchIds });
  if (branches.isErr()) return err({ code: 'BranchUnavailable', message: branches.error.message });
  const unavailable = branches.value.find((branch) => !branch.isActive || branch.isDeleted);
  return unavailable ? err({ code: 'BranchUnavailable', message: `Branch "${unavailable.branchId}" is unavailable.` }) : ok(undefined);
}

function mapTenantError(error: OperationalSetupValidationError): CreatePackageError {
  if (error.code === 'TenantUnavailable') {
    return createPackageError('offering_setup.tenant_unavailable', error.message, error);
  }
  if (error.code === 'BranchUnavailable') {
    return createPackageError('offering_setup.branch_unavailable', error.message, error);
  }
  throw error;
}

function mapAssetInventoryError(error: PhysicalStockSufficiencyError): CreatePackageError {
  if (error.code === 'EquipmentTypeNotFound') {
    return createPackageError('offering_setup.equipment_type_not_found', error.message, error, {
      equipmentTypeId: error.equipmentTypeId,
    });
  }
  if (error.code === 'InsufficientActivePhysicalStock') {
    return createPackageError('offering_setup.insufficient_active_equipment_stock', error.message, error, {
      equipmentTypeId: error.equipmentTypeId,
      branchId: error.branchId,
      requiredQuantity: error.requiredQuantity,
      activeAssetCount: error.activeAssetCount,
    });
  }
  throw error;
}

function mapCatalogError(error: CatalogOfferingAuthoringError): CreatePackageError {
  if (error.code === 'InvalidField') {
    return createPackageError('offering_setup.invalid_package', error.message, error);
  }
  if (error.code === 'EquipmentTypeNotFound') {
    return createPackageError('offering_setup.equipment_type_not_found', error.message, error);
  }
  if (
    error.code === 'BranchNotFound' ||
    error.code === 'BranchInactive' ||
    error.code === 'BranchDeleted' ||
    error.code === 'BranchContextUnavailable'
  ) {
    return createPackageError('offering_setup.branch_unavailable', error.message, error);
  }
  throw error;
}
