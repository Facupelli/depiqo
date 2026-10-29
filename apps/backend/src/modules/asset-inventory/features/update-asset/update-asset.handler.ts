import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';

import { AssetRepository } from '../../persistence/asset.repository';
import { UpdateAssetCommand } from './update-asset.command';
import { UpdateAssetError, updateAssetError } from './update-asset.errors';

export type UpdateAssetResult = Result<void, UpdateAssetError>;

@CommandHandler(UpdateAssetCommand)
export class UpdateAssetHandler implements ICommandHandler<UpdateAssetCommand, UpdateAssetResult> {
  constructor(
    private readonly repository: AssetRepository,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: UpdateAssetCommand): Promise<UpdateAssetResult> {
    return this.unitOfWork.runInTransaction(async ({ tx }) => {
      const asset = await this.repository.loadByIdForTenantForUpdate(
        { tenantId: command.tenantId, assetId: command.assetId },
        tx,
      );
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

      await this.repository.save(asset, tx);

      return ok(undefined);
    });
  }
}
