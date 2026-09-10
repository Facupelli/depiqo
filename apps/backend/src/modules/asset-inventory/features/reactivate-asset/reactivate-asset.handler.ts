import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';

import { toAssetInventoryIntegrationEvents } from '../../application/asset-inventory-integration-event.mapper';
import { AssetRepository } from '../../persistence/asset.repository';
import { ReactivateAssetCommand } from './reactivate-asset.command';
import { ReactivateAssetError, reactivateAssetError } from './reactivate-asset.errors';

export type ReactivateAssetResult = Result<void, ReactivateAssetError>;

@CommandHandler(ReactivateAssetCommand)
export class ReactivateAssetHandler implements ICommandHandler<ReactivateAssetCommand, ReactivateAssetResult> {
  constructor(
    private readonly repository: AssetRepository,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: ReactivateAssetCommand): Promise<ReactivateAssetResult> {
    const asset = await this.repository.loadByIdForTenant({ tenantId: command.tenantId, assetId: command.assetId });
    if (!asset) {
      return err(
        reactivateAssetError('asset_inventory.asset_not_found', 'Asset not found.', undefined, {
          assetId: command.assetId,
        }),
      );
    }

    const result = asset.reactivate();
    if (result.isErr()) {
      return err(
        reactivateAssetError('asset_inventory.invalid_asset_lifecycle_transition', result.error.message, result.error, {
          assetId: result.error.assetId,
          currentStatus: result.error.currentStatus,
          requestedStatus: result.error.requestedStatus,
        }),
      );
    }
    if (!result.value) {
      return ok(undefined);
    }

    await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
      await this.repository.save(asset, tx);
      integrationEvents.collect(toAssetInventoryIntegrationEvents(asset.pullDomainEvents()));
    });

    return ok(undefined);
  }
}
