import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';

import { toAssetInventoryIntegrationEvents } from '../../application/asset-inventory-integration-event.mapper';
import { AssetRepository } from '../../persistence/asset.repository';
import { RetireAssetCommand } from './retire-asset.command';
import { RetireAssetError, retireAssetError } from './retire-asset.errors';

export type RetireAssetResult = Result<void, RetireAssetError>;

@CommandHandler(RetireAssetCommand)
export class RetireAssetHandler implements ICommandHandler<RetireAssetCommand, RetireAssetResult> {
  constructor(
    private readonly repository: AssetRepository,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: RetireAssetCommand): Promise<RetireAssetResult> {
    const asset = await this.repository.loadByIdForTenant({ tenantId: command.tenantId, assetId: command.assetId });
    if (!asset) {
      return err(
        retireAssetError('asset_inventory.asset_not_found', 'Asset not found.', undefined, {
          assetId: command.assetId,
        }),
      );
    }

    const retired = asset.retire();
    if (!retired) {
      return ok(undefined);
    }

    await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
      await this.repository.save(asset, tx);
      integrationEvents.collect(toAssetInventoryIntegrationEvents(asset.pullDomainEvents()));
    });

    return ok(undefined);
  }
}
