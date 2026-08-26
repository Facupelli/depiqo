import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';

import { toAssetInventoryIntegrationEvents } from '../../application/asset-inventory-integration-event.mapper';
import { AssetOwnershipResolver } from '../../application/services/asset-ownership-resolver.service';
import { AssetRepository } from '../../persistence/asset.repository';
import { ChangeAssetOwnerCommand } from './change-asset-owner.command';
import { ChangeAssetOwnerError, changeAssetOwnerError, mapAssetInventoryError } from './change-asset-owner.errors';

export type ChangeAssetOwnerResult = Result<void, ChangeAssetOwnerError>;

@CommandHandler(ChangeAssetOwnerCommand)
export class ChangeAssetOwnerHandler implements ICommandHandler<ChangeAssetOwnerCommand, ChangeAssetOwnerResult> {
  constructor(
    private readonly repository: AssetRepository,
    private readonly ownershipResolver: AssetOwnershipResolver,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: ChangeAssetOwnerCommand): Promise<ChangeAssetOwnerResult> {
    return this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
      const asset = await this.repository.loadByIdForTenant(
        {
          tenantId: command.tenantId,
          assetId: command.assetId,
        },
        tx,
      );
      if (!asset) {
        return err(
          changeAssetOwnerError('asset_inventory.asset_not_found', 'Asset not found.', undefined, {
            assetId: command.assetId,
          }),
        );
      }

      const ownerId = normalizeNullableString(command.ownerId);
      if (ownerId === asset.ownerId) {
        return ok(undefined);
      }

      const ownership = await this.ownershipResolver.resolveOwnership(
        {
          tenantId: command.tenantId,
          ownerId,
          now: new Date(),
        },
        tx,
      );
      if (ownership.isErr()) {
        return err(mapAssetInventoryError(ownership.error));
      }

      const changed = asset.changeOwner(ownership.value);
      if (changed.isErr()) {
        return err(mapAssetInventoryError(changed.error));
      }
      if (!changed.value) {
        return ok(undefined);
      }

      await this.repository.save(asset, tx);
      integrationEvents.collect(toAssetInventoryIntegrationEvents(asset.pullDomainEvents()));

      return ok(undefined);
    });
  }
}

function normalizeNullableString(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}
