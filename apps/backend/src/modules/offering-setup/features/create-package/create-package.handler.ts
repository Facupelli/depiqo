import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { AssetInventoryPublicApi } from '../../../asset-inventory/public-api/asset-inventory.public-api';
import { CatalogPublicApi } from '../../../catalog/public-api/catalog.public-api';
import { TenantManagementPublicApi } from '../../../tenant-management/public-api/tenant-management.public-api';
import { CreatePackageCommand } from './create-package.command';
import { mapAssetInventoryError, mapCatalogError, mapTenantManagementError } from './map-create-package-error';
import { OfferingSetupApplicationError } from '../offering-setup-application.error';

export type CreatePackageServiceResult = Result<
  {
    rentableItemId: string;
    rentalOfferIds: string[];
  },
  OfferingSetupApplicationError
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

    if (tenantValidation.isErr()) {
      return err(mapTenantManagementError(tenantValidation.error));
    }

    const equipmentTypeValidation = await this.assetInventory.validateEquipmentType({
      tenantId: command.tenantId,
      equipmentIds: command.requirements.map((requirement) => requirement.equipmentTypeId),
    });

    if (equipmentTypeValidation.isErr()) {
      return err(mapAssetInventoryError(equipmentTypeValidation.error));
    }

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

    if (rentableItem.isErr()) {
      return err(mapCatalogError(rentableItem.error));
    }

    return ok({
      rentableItemId: rentableItem.value.rentableItemId,
      rentalOfferIds: rentableItem.value.rentalOfferIds,
    });
  }
}
