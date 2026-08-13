import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import {
  AssetInventoryPublicApi,
  AssetInventoryPublicApiError,
} from '../../../asset-inventory/public-api/asset-inventory.public-api';
import {
  CatalogOfferingAuthoring,
  CatalogOfferingAuthoringError,
} from '../../../catalog/public-api/catalog-offering-authoring.public-api';
import {
  TenantManagementPublicApi,
  ValidateOfferingSetupError,
} from '../../../tenant-management/public-api/tenant-management.public-api';
import { CreateRentableEquipmentCommand } from './create-rentable-equipment.command';
import { CreateRentableEquipmentError, createRentableEquipmentError } from './create-rentable-equipment.errors';

export type CreateRentableEquipmentServiceResult = Result<
  { equipmentTypeId: string; assetIds: string[]; rentableItemId: string; rentalOfferIds: string[] },
  CreateRentableEquipmentError
>;

@CommandHandler(CreateRentableEquipmentCommand)
export class CreateRentableEquipmentHandler implements ICommandHandler<
  CreateRentableEquipmentCommand,
  CreateRentableEquipmentServiceResult
> {
  constructor(
    private readonly tenantManagement: TenantManagementPublicApi,
    private readonly assetInventory: AssetInventoryPublicApi,
    private readonly catalog: CatalogOfferingAuthoring,
  ) {}

  async execute(command: CreateRentableEquipmentCommand): Promise<CreateRentableEquipmentServiceResult> {
    const branchIds = [...new Set(command.assets.map((asset) => asset.branchId))];
    const tenantValidation = await this.tenantManagement.validateOfferingSetup({
      tenantId: command.tenantId,
      branchIds,
    });
    if (tenantValidation.isErr()) return err(mapTenantError(tenantValidation.error));

    const equipmentSetup = await this.assetInventory.createEquipmentTypeSetup({
      tenantId: command.tenantId,
      equipmentType: {
        name: command.name,
        description: command.description,
        categoryId: command.categoryId,
      },
      assets: command.assets,
    });
    if (equipmentSetup.isErr()) return err(mapAssetInventoryError(equipmentSetup.error));

    const rentableItem = await this.catalog.createRentableItemOffering({
      tenantId: command.tenantId,
      name: command.name,
      description: command.description,
      imageUrl: command.imageUrl,
      // This workflow has one category choice. It is stored on the EquipmentType
      // and reused for its standalone RentableItem rather than selected twice.
      categoryId: command.categoryId,
      kind: command.kind,
      requirements: [
        { equipmentTypeId: equipmentSetup.value.equipmentTypeId, quantityPerItem: command.quantityPerItem },
      ],
      branchIds,
    });
    if (rentableItem.isErr()) return err(mapCatalogError(rentableItem.error));

    return ok({ ...equipmentSetup.value, ...rentableItem.value });
  }
}

function mapTenantError(error: ValidateOfferingSetupError): CreateRentableEquipmentError {
  const code =
    error.code === 'TenantUnavailable' ? 'offering_setup.tenant_unavailable' : 'offering_setup.branch_unavailable';
  return createRentableEquipmentError(code, error.message, error, error.context);
}

function mapAssetInventoryError(error: AssetInventoryPublicApiError): CreateRentableEquipmentError {
  const codes = {
    InvalidEquipmentTypeField: 'offering_setup.invalid_equipment',
    InvalidAssetField: 'offering_setup.invalid_equipment',
    DuplicateEquipmentTypeName: 'offering_setup.duplicate_equipment_type_name',
    AssetOwnerNotFound: 'offering_setup.asset_owner_not_found',
    ActiveOwnerContractNotFound: 'offering_setup.active_owner_contract_not_found',
    MultipleActiveOwnerContracts: 'offering_setup.multiple_active_owner_contracts',
    CategoryNotFound: 'offering_setup.invalid_equipment',
    CategoryInactive: 'offering_setup.invalid_equipment',
  } as const;
  const code = codes[error.code as keyof typeof codes];
  if (!code) throw error;
  return createRentableEquipmentError(code, error.message, error, error.context);
}

function mapCatalogError(error: CatalogOfferingAuthoringError): CreateRentableEquipmentError {
  if (error.code === 'InvalidField') {
    return createRentableEquipmentError('offering_setup.invalid_rentable_item', error.message, error);
  }
  if (error.code === 'EquipmentTypeNotFound') {
    return createRentableEquipmentError('offering_setup.invalid_equipment', error.message, error);
  }
  if (
    error.code === 'BranchNotFound' ||
    error.code === 'BranchInactive' ||
    error.code === 'BranchDeleted' ||
    error.code === 'BranchContextUnavailable'
  ) {
    return createRentableEquipmentError('offering_setup.branch_unavailable', error.message, error);
  }
  throw error;
}
