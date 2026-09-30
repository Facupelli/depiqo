import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AssetInventoryAuthoringService } from '../../public-api/asset-inventory-authoring.public-api.service';
import { AddAssetsToEquipmentTypeCommand } from './add-assets-to-equipment-type.command';
import { AddAssetsToEquipmentTypeError, mapInventoryCreationError } from './add-assets-to-equipment-type.errors';

export type AddAssetsToEquipmentTypeServiceResult = Result<{ assetIds: string[] }, AddAssetsToEquipmentTypeError>;

@CommandHandler(AddAssetsToEquipmentTypeCommand)
export class AddAssetsToEquipmentTypeHandler implements ICommandHandler<
  AddAssetsToEquipmentTypeCommand,
  AddAssetsToEquipmentTypeServiceResult
> {
  constructor(private readonly authoring: AssetInventoryAuthoringService) {}

  async execute(command: AddAssetsToEquipmentTypeCommand): Promise<AddAssetsToEquipmentTypeServiceResult> {
    const result = await this.authoring.addAssetsToEquipmentType(command);
    return result.mapErr(mapInventoryCreationError);
  }
}
