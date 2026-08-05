import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { TenantManagementPublicApi } from '../../../tenant-management/public-api/tenant-management.public-api';
import { CreateEquipmentTypeSetupCommand } from '../create-equipment-type-setup/create-equipment-type-setup.command';
import {
  CreateEquipmentTypeSetupResult,
  CreateEquipmentTypeSetupService,
} from '../create-equipment-type-setup/create-equipment-type-setup.service';
import { CreateEquipmentTypeCommand } from './create-equipment-type.command';
import {
  CreateEquipmentTypeError,
  mapAssetInventoryError,
  mapTenantValidationError,
} from './create-equipment-type.errors';

export type CreateEquipmentTypeServiceResult = Result<CreateEquipmentTypeSetupResult, CreateEquipmentTypeError>;

@CommandHandler(CreateEquipmentTypeCommand)
export class CreateEquipmentTypeHandler implements ICommandHandler<
  CreateEquipmentTypeCommand,
  CreateEquipmentTypeServiceResult
> {
  constructor(
    private readonly tenantManagement: TenantManagementPublicApi,
    private readonly createEquipmentTypeSetupService: CreateEquipmentTypeSetupService,
  ) {}

  async execute(command: CreateEquipmentTypeCommand): Promise<CreateEquipmentTypeServiceResult> {
    const branchIds = [...new Set(command.assets.map((asset) => asset.branchId))];

    const tenantValidation = await this.tenantManagement.validateOfferingSetup({
      tenantId: command.tenantId,
      branchIds,
    });
    if (tenantValidation.isErr()) {
      return err(mapTenantValidationError(tenantValidation.error));
    }

    const equipmentTypeSetup = await this.createEquipmentTypeSetupService.execute(
      new CreateEquipmentTypeSetupCommand({
        tenantId: command.tenantId,
        name: command.name,
        description: command.description,
        assets: command.assets,
      }),
    );

    if (equipmentTypeSetup.isErr()) {
      return err(mapAssetInventoryError(equipmentTypeSetup.error));
    }

    return ok(equipmentTypeSetup.value);
  }
}
