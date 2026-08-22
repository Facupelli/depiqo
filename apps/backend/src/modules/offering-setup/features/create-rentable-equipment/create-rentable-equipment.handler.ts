import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import {
  AssetInventoryAuthoring,
  AssetInventoryAuthoringError,
} from '../../../asset-inventory/public-api/asset-inventory-authoring.public-api';
import {
  CatalogOfferingAuthoring,
  CatalogOfferingAuthoringError,
} from '../../../catalog/public-api/catalog-offering-authoring.public-api';
import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { TenantOperationalFacts } from 'src/modules/tenant-management/public-api/tenant-operational-facts.public-api';
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
    private readonly tenantOperationalFacts: TenantOperationalFacts,
    private readonly branchFacts: BranchFacts,
    private readonly assetInventoryAuthoring: AssetInventoryAuthoring,
    private readonly catalog: CatalogOfferingAuthoring,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: CreateRentableEquipmentCommand): Promise<CreateRentableEquipmentServiceResult> {
    const branchIds = [...new Set(command.assets.map((asset) => asset.branchId))];
    const tenantValidation = await validateOperationalSetup(
      this.tenantOperationalFacts,
      this.branchFacts,
      command.tenantId,
      branchIds,
    );
    if (tenantValidation.isErr()) return err(mapTenantError(tenantValidation.error));

    // Offering Setup owns the outer transaction for this workflow. Asset
    // Inventory and Catalog join it through their own transactional
    // boundaries, so a Catalog failure rolls back the Inventory writes too.
    return this.unitOfWork.runResultInTransaction(async () => {
      const equipmentSetup = await this.assetInventoryAuthoring.createEquipmentTypeWithInitialAssets({
        tenantId: command.tenantId,
        equipmentType: {
          name: command.name,
          description: command.description,
          imageUrl: command.imageUrl,
          categoryId: command.categoryId,
        },
        initialAssets: command.assets,
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
    });
  }
}

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

function mapTenantError(error: OperationalSetupValidationError): CreateRentableEquipmentError {
  const code =
    error.code === 'TenantUnavailable' ? 'offering_setup.tenant_unavailable' : 'offering_setup.branch_unavailable';
  return createRentableEquipmentError(code, error.message, error);
}

function mapAssetInventoryError(error: AssetInventoryAuthoringError): CreateRentableEquipmentError {
  const codes = {
    InvalidEquipmentTypeField: 'offering_setup.invalid_equipment',
    InvalidAssetField: 'offering_setup.invalid_equipment',
    DuplicateEquipmentTypeName: 'offering_setup.duplicate_equipment_type_name',
    AssetOwnerNotFound: 'offering_setup.asset_owner_not_found',
    ActiveOwnerContractNotFound: 'offering_setup.active_owner_contract_not_found',
    MultipleActiveOwnerContracts: 'offering_setup.multiple_active_owner_contracts',
    CategoryNotFound: 'offering_setup.invalid_equipment',
    CategoryInactive: 'offering_setup.invalid_equipment',
    BranchNotFound: 'offering_setup.branch_unavailable',
    BranchInactive: 'offering_setup.branch_unavailable',
    BranchDeleted: 'offering_setup.branch_unavailable',
    BranchReferenceUnavailable: 'offering_setup.branch_unavailable',
  } as const;
  const code = codes[error.code as keyof typeof codes];
  if (!code) throw error;
  return createRentableEquipmentError(code, error.message, error, error.details);
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
