import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { AssetRepository } from '../../persistence/asset.repository';
import { UpdateAssetCommand } from './update-asset.command';
import { UpdateAssetError, updateAssetError } from './update-asset.errors';

export type UpdateAssetResult = Result<void, UpdateAssetError>;

@CommandHandler(UpdateAssetCommand)
export class UpdateAssetHandler implements ICommandHandler<UpdateAssetCommand, UpdateAssetResult> {
  constructor(private readonly repository: AssetRepository) {}

  async execute(command: UpdateAssetCommand): Promise<UpdateAssetResult> {
    const asset = await this.repository.loadByIdForTenant({ tenantId: command.tenantId, assetId: command.assetId });
    if (!asset) {
      return err(
        updateAssetError('asset_inventory.asset_not_found', 'Asset not found.', undefined, {
          assetId: command.assetId,
        }),
      );
    }

    const changed = asset.updateMetadata({ serialNumber: command.serialNumber, notes: command.notes });
    if (!changed) {
      return ok(undefined);
    }

    await this.repository.save(asset);

    return ok(undefined);
  }
}
