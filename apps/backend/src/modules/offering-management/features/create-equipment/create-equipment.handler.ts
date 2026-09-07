import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import {
  AssetInventoryAuthoring,
  AssetInventoryAuthoringError,
} from '../../../asset-inventory/public-api/asset-inventory-authoring.public-api';
import {
  CatalogOfferingAuthoring,
  CatalogOfferingAuthoringError,
} from '../../../catalog/public-api/catalog-offering-authoring.public-api';
import { TenantOperationalFacts } from 'src/modules/tenant-management/public-api/tenant-operational-facts.public-api';
import { CreateEquipmentCommand } from './create-equipment.command';
import { CreateEquipmentError, createEquipmentError } from './create-equipment.errors';

export type CreateEquipmentServiceResult = Result<
  {
    equipmentTypeId: string;
    assetIds: string[];
    standaloneRental: { rentableItemId: string; rentalOfferIds: string[] } | null;
  },
  CreateEquipmentError
>;

@CommandHandler(CreateEquipmentCommand)
export class CreateEquipmentHandler implements ICommandHandler<CreateEquipmentCommand, CreateEquipmentServiceResult> {
  constructor(
    private readonly tenantOperationalFacts: TenantOperationalFacts,
    private readonly assetInventoryAuthoring: AssetInventoryAuthoring,
    private readonly catalog: CatalogOfferingAuthoring,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: CreateEquipmentCommand): Promise<CreateEquipmentServiceResult> {
    const tenant = await this.tenantOperationalFacts.getTenantOperationalFacts({ tenantId: command.tenantId });
    if (tenant.isErr())
      return err(createEquipmentError('offering_setup.tenant_unavailable', tenant.error.message, tenant.error));

    return this.unitOfWork.runResultInTransaction(async () => {
      const equipmentSetup = await this.assetInventoryAuthoring.createEquipmentTypeWithInitialAssets({
        tenantId: command.tenantId,
        equipmentType: command.equipment,
        initialAssets: command.assets,
      });
      if (equipmentSetup.isErr()) return err(mapAssetInventoryError(equipmentSetup.error));

      if (!command.standaloneRental) {
        return ok({ ...equipmentSetup.value, standaloneRental: null });
      }

      const standaloneRental = await this.catalog.createRentableItemOffering({
        tenantId: command.tenantId,
        name: command.standaloneRental.name,
        description: command.standaloneRental.description,
        imageUrl: command.standaloneRental.imageUrl,
        categoryId: command.standaloneRental.categoryId,
        kind: 'SINGLE',
        requirements: [{ equipmentTypeId: equipmentSetup.value.equipmentTypeId, quantityPerItem: 1 }],
        branchIds: command.standaloneRental.branchIds,
      });
      if (standaloneRental.isErr()) return err(mapCatalogError(standaloneRental.error));

      return ok({ ...equipmentSetup.value, standaloneRental: standaloneRental.value });
    });
  }
}

function mapAssetInventoryError(error: AssetInventoryAuthoringError): CreateEquipmentError {
  switch (error.code) {
    case 'InvalidEquipmentTypeField':
    case 'InvalidAssetField':
    case 'CategoryNotFound':
    case 'CategoryInactive':
      return createEquipmentError('offering_setup.invalid_equipment', error.message, error, error.details);
    case 'DuplicateEquipmentTypeName':
      return createEquipmentError('offering_setup.duplicate_equipment_type_name', error.message, error, error.details);
    case 'AssetOwnerNotFound':
      return createEquipmentError('offering_setup.asset_owner_not_found', error.message, error, error.details);
    case 'ActiveOwnerContractNotFound':
      return createEquipmentError(
        'offering_setup.active_owner_contract_not_found',
        error.message,
        error,
        error.details,
      );
    case 'MultipleActiveOwnerContracts':
      return createEquipmentError(
        'offering_setup.multiple_active_owner_contracts',
        error.message,
        error,
        error.details,
      );
    case 'BranchNotFound':
    case 'BranchInactive':
    case 'BranchDeleted':
    case 'BranchReferenceUnavailable':
      return createEquipmentError('offering_setup.branch_unavailable', error.message, error, error.details);
    default:
      return assertNever(error.code);
  }
}

function mapCatalogError(error: CatalogOfferingAuthoringError): CreateEquipmentError {
  switch (error.code) {
    case 'InvalidField':
      return createEquipmentError('offering_setup.invalid_standalone_rental', error.message, error);
    case 'BranchNotFound':
    case 'BranchInactive':
    case 'BranchDeleted':
    case 'BranchContextUnavailable':
      return createEquipmentError('offering_setup.branch_unavailable', error.message, error);
    case 'EquipmentTypeNotFound':
    case 'RentableItemNotFound':
    case 'RentableItemArchived':
    case 'RentalOfferAlreadyExists':
    case 'RentableItemRequirementAlreadyExists':
      throw error;
    default:
      return assertNever(error.code);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled provider error code: ${String(value)}`);
}
