import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { AssetInventoryPublicApi } from '../../../asset-inventory/public-api/asset-inventory.public-api';
import { CatalogPublicApi } from '../../../catalog/public-api/catalog.public-api';
import { TenantManagementPublicApi } from '../../../tenant-management/public-api/tenant-management.public-api';
import { CreateRentableEquipmentCommand } from './create-rentable-equipment.command';
import {
  mapAssetInventoryError,
  mapCatalogError,
  mapTenantManagementError,
} from './map-create-rentable-equipment-error';
import { OfferingSetupApplicationError } from '../offering-setup-application.error';

export type CreateRentableEquipmentServiceResult = Result<
  {
    equipmentTypeId: string;
    assetIds: string[];
    rentableItemId: string;
    rentalOfferIds: string[];
  },
  OfferingSetupApplicationError
>;

@CommandHandler(CreateRentableEquipmentCommand)
export class CreateRentableEquipmentHandler implements ICommandHandler<
  CreateRentableEquipmentCommand,
  CreateRentableEquipmentServiceResult
> {
  constructor(
    private readonly tenantManagement: TenantManagementPublicApi,
    private readonly assetInventory: AssetInventoryPublicApi,
    private readonly catalog: CatalogPublicApi,
  ) {}

  async execute(command: CreateRentableEquipmentCommand): Promise<CreateRentableEquipmentServiceResult> {
    const branchIds = [...new Set(command.assets.map((asset) => asset.branchId))];

    const tenantValidation = await this.tenantManagement.validateOfferingSetup({
      tenantId: command.tenantId,
      branchIds,
    });

    if (tenantValidation.isErr()) {
      return err(mapTenantManagementError(tenantValidation.error));
    }

    const equipmentSetup = await this.assetInventory.createEquipmentTypeSetup({
      tenantId: command.tenantId,
      equipmentType: {
        name: command.name,
        description: command.description,
      },
      assets: command.assets,
    });

    if (equipmentSetup.isErr()) {
      return err(mapAssetInventoryError(equipmentSetup.error));
    }

    const rentableItem = await this.catalog.createRentableItemOffering({
      tenantId: command.tenantId,
      name: command.name,
      description: command.description,
      imageUrl: command.imageUrl,
      categoryId: command.categoryId,
      kind: command.kind,
      requirements: [
        {
          equipmentTypeId: equipmentSetup.value.equipmentTypeId,
          quantityPerItem: command.quantityPerItem,
        },
      ],
      branchIds,
    });

    if (rentableItem.isErr()) {
      return err(mapCatalogError(rentableItem.error));
    }

    return ok({
      equipmentTypeId: equipmentSetup.value.equipmentTypeId,
      assetIds: equipmentSetup.value.assetIds,
      rentableItemId: rentableItem.value.rentableItemId,
      rentalOfferIds: rentableItem.value.rentalOfferIds,
    });
  }
}
