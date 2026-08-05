import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import {
  AssetInventoryPublicApi,
  AssetInventoryPublicApiError,
} from '../../../asset-inventory/public-api/asset-inventory.public-api';
import { CatalogPublicApi, CatalogPublicApiError } from '../../../catalog/public-api/catalog.public-api';
import {
  TenantManagementPublicApi,
  ValidateOfferingSetupError,
} from '../../../tenant-management/public-api/tenant-management.public-api';
import { CreatePackageCommand } from './create-package.command';
import { CreatePackageError, createPackageError } from './create-package.errors';

export type CreatePackageServiceResult = Result<
  { rentableItemId: string; rentalOfferIds: string[] },
  CreatePackageError
>;

@CommandHandler(CreatePackageCommand)
export class CreatePackageHandler implements ICommandHandler<CreatePackageCommand, CreatePackageServiceResult> {
  constructor(
    private readonly tenantManagement: TenantManagementPublicApi,
    private readonly assetInventory: AssetInventoryPublicApi,
    private readonly catalog: CatalogPublicApi,
  ) {}

  async execute(command: CreatePackageCommand): Promise<CreatePackageServiceResult> {
    const tenantValidation = await this.tenantManagement.validateOfferingSetup({
      tenantId: command.tenantId,
      branchIds: command.branchIds,
    });
    if (tenantValidation.isErr()) return err(mapTenantError(tenantValidation.error));

    const equipmentValidation = await this.assetInventory.validatePackageRequirementsForBranches({
      tenantId: command.tenantId,
      branchIds: command.branchIds,
      requirements: command.requirements,
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

function mapTenantError(error: ValidateOfferingSetupError): CreatePackageError {
  if (error.code === 'TenantUnavailable') {
    return createPackageError('offering_setup.tenant_unavailable', error.message, error, error.context);
  }
  if (error.code === 'BranchUnavailable') {
    return createPackageError('offering_setup.branch_unavailable', error.message, error, error.context);
  }
  throw error;
}

function mapAssetInventoryError(error: AssetInventoryPublicApiError): CreatePackageError {
  const codes = {
    EquipmentTypeNotFound: 'offering_setup.equipment_type_not_found',
    EquipmentTypeNotActive: 'offering_setup.equipment_type_inactive',
    InsufficientActiveEquipmentStock: 'offering_setup.insufficient_active_equipment_stock',
  } as const;
  const code = codes[error.code as keyof typeof codes];
  if (!code) throw error;
  return createPackageError(code, error.message, error, error.context);
}

function mapCatalogError(error: CatalogPublicApiError): CreatePackageError {
  if (error.code !== 'InvalidField') throw error;
  return createPackageError('offering_setup.invalid_package', error.message, error, error.context);
}
