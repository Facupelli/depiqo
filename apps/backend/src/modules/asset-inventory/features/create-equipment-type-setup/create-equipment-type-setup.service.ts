import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';

import { toAssetInventoryIntegrationEvents } from '../../application/asset-inventory-integration-event.mapper';
import { AssetCreationValidatorService } from '../../application/services/asset-creation-validator.service';
import { Asset } from '../../domain/asset.entity';
import { EquipmentType } from '../../domain/equipment-type.entity';
import { AssetInventoryError, DuplicateEquipmentTypeNameError } from '../../domain/errors/asset-inventory.errors';
import { AssetRepository } from '../../persistence/asset.repository';
import { EquipmentTypeRepository } from '../../persistence/equipment-type.repository';
import { CreateEquipmentTypeSetupCommand } from './create-equipment-type-setup.command';

export interface CreateEquipmentTypeSetupResult {
  equipmentTypeId: string;
  assetIds: string[];
}

@Injectable()
export class CreateEquipmentTypeSetupService {
  constructor(
    private readonly equipmentTypeRepository: EquipmentTypeRepository,
    private readonly assetRepository: AssetRepository,
    private readonly assetCreationValidator: AssetCreationValidatorService,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(
    command: CreateEquipmentTypeSetupCommand,
  ): Promise<Result<CreateEquipmentTypeSetupResult, AssetInventoryError>> {
    const equipmentType = EquipmentType.create({
      tenantId: command.tenantId,
      name: command.name,
      description: command.description,
      categoryId: command.categoryId,
    });

    if (equipmentType.isErr()) {
      return err(equipmentType.error);
    }

    const existing = await this.equipmentTypeRepository.loadByNameForTenant({
      tenantId: equipmentType.value.tenantId,
      name: equipmentType.value.name,
    });

    if (existing) {
      return err(new DuplicateEquipmentTypeNameError(equipmentType.value.name));
    }

    const assetCreationValidation = await this.assetCreationValidator.validateAssetsCanBeCreated({
      tenantId: equipmentType.value.tenantId,
      assets: command.assets,
    });
    if (assetCreationValidation.isErr()) {
      return err(assetCreationValidation.error);
    }

    const assets: Asset[] = [];
    for (const assetInput of command.assets) {
      const ownerId = assetInput.ownerId?.trim() || null;
      const asset = Asset.create({
        tenantId: equipmentType.value.tenantId,
        equipmentTypeId: equipmentType.value.id,
        branchId: assetInput.branchId,
        serialNumber: assetInput.serialNumber,
        notes: assetInput.notes,
        ownerId,
        ownerContractSnapshot: ownerId
          ? assetCreationValidation.value.ownerContractSnapshotsByOwnerId.get(ownerId)
          : null,
      });

      if (asset.isErr()) {
        return err(asset.error);
      }

      assets.push(asset.value);
    }

    await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
      await this.equipmentTypeRepository.save(equipmentType.value, tx);
      await this.assetRepository.createMany(assets, tx);

      for (const asset of assets) {
        integrationEvents.collect(toAssetInventoryIntegrationEvents(asset.pullDomainEvents()));
      }
    });

    return ok({ equipmentTypeId: equipmentType.value.id, assetIds: assets.map((asset) => asset.id) });
  }
}
