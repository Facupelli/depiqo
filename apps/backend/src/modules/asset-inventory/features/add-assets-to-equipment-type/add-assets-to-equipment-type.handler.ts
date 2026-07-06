import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';

import { AssetCreationValidatorService } from '../../application/services/asset-creation-validator.service';
import { Asset } from '../../domain/asset.entity';
import { EquipmentTypeNotActiveError, EquipmentTypeNotFoundError } from '../../domain/errors/asset-inventory.errors';
import { AssetRepository } from '../../persistence/asset.repository';
import { EquipmentTypeRepository } from '../../persistence/equipment-type.repository';
import { TenantManagementPublicApi } from '../../../tenant-management/public-api/tenant-management.public-api';
import { AddAssetsToEquipmentTypeApplicationError } from './add-assets-to-equipment-type-application.error';
import { AddAssetsToEquipmentTypeCommand } from './add-assets-to-equipment-type.command';
import { mapAssetInventoryError, mapTenantManagementError } from './map-add-assets-to-equipment-type-error';

export type AddAssetsToEquipmentTypeServiceResult = Result<
  {
    assetIds: string[];
  },
  AddAssetsToEquipmentTypeApplicationError
>;

@CommandHandler(AddAssetsToEquipmentTypeCommand)
export class AddAssetsToEquipmentTypeHandler implements ICommandHandler<
  AddAssetsToEquipmentTypeCommand,
  AddAssetsToEquipmentTypeServiceResult
> {
  constructor(
    private readonly tenantManagement: TenantManagementPublicApi,
    private readonly equipmentTypeRepository: EquipmentTypeRepository,
    private readonly assetRepository: AssetRepository,
    private readonly assetCreationValidator: AssetCreationValidatorService,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: AddAssetsToEquipmentTypeCommand): Promise<AddAssetsToEquipmentTypeServiceResult> {
    const branchIds = [...new Set(command.assets.map((asset) => asset.branchId))];

    const tenantValidation = await this.tenantManagement.validateOfferingSetup({
      tenantId: command.tenantId,
      branchIds,
    });
    if (tenantValidation.isErr()) {
      return err(mapTenantManagementError(tenantValidation.error));
    }

    const equipmentType = await this.equipmentTypeRepository.loadByIdForTenant({
      tenantId: command.tenantId,
      equipmentTypeId: command.equipmentTypeId,
    });
    if (!equipmentType) {
      return err(mapAssetInventoryError(new EquipmentTypeNotFoundError(command.equipmentTypeId)));
    }
    if (!equipmentType.isActive) {
      return err(mapAssetInventoryError(new EquipmentTypeNotActiveError(command.equipmentTypeId)));
    }

    const assetCreationValidation = await this.assetCreationValidator.validateAssetsCanBeCreated({
      tenantId: command.tenantId,
      equipmentTypeId: equipmentType.id,
      assets: command.assets,
    });
    if (assetCreationValidation.isErr()) {
      return err(mapAssetInventoryError(assetCreationValidation.error));
    }

    const assets: Asset[] = [];
    for (const assetInput of command.assets) {
      const ownerId = assetInput.ownerId?.trim() || null;
      const asset = Asset.create({
        tenantId: command.tenantId,
        equipmentTypeId: equipmentType.id,
        branchId: assetInput.branchId,
        serialNumber: assetInput.serialNumber,
        notes: assetInput.notes,
        ownerId,
        ownerContractSnapshot: ownerId
          ? assetCreationValidation.value.ownerContractSnapshotsByOwnerId.get(ownerId)
          : null,
      });

      if (asset.isErr()) {
        return err(mapAssetInventoryError(asset.error));
      }

      assets.push(asset.value);
    }

    await this.unitOfWork.runInTransaction(async ({ tx, events }) => {
      await this.assetRepository.save(assets, tx);

      for (const asset of assets) {
        events.collectFrom(asset);
      }
    });

    return ok({ assetIds: assets.map((asset) => asset.id) });
  }
}
