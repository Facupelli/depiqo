import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AssetInventoryAuthoring } from '../../public-api/asset-inventory-authoring.public-api';
import { CreateEquipmentTypeCommand } from './create-equipment-type.command';
import { CreateEquipmentTypeError, mapAuthoringError } from './create-equipment-type.errors';

export type CreateEquipmentTypeServiceResult = Result<
  { equipmentTypeId: string; assetIds: string[] },
  CreateEquipmentTypeError
>;

@CommandHandler(CreateEquipmentTypeCommand)
export class CreateEquipmentTypeHandler implements ICommandHandler<
  CreateEquipmentTypeCommand,
  CreateEquipmentTypeServiceResult
> {
  constructor(private readonly authoring: AssetInventoryAuthoring) {}

  async execute(command: CreateEquipmentTypeCommand): Promise<CreateEquipmentTypeServiceResult> {
    const result = await this.authoring.createEquipmentTypeWithInitialAssets({
      tenantId: command.tenantId,
      equipmentType: {
        name: command.name,
        description: command.description,
        imageUrl: command.imageUrl,
        categoryId: command.categoryId,
      },
      initialAssets: command.assets,
    });
    return result.mapErr(mapAuthoringError);
  }
}
