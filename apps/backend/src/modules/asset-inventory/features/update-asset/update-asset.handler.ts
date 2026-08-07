import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';
import { Prisma } from 'src/generated/prisma/client';

import { AssetRepository } from '../../persistence/asset.repository';
import { UpdateAssetCommand } from './update-asset.command';
import { duplicateAssetSerialNumberError, UpdateAssetError, updateAssetError } from './update-asset.errors';

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

    if (command.serialNumber !== undefined && command.serialNumber !== null && asset.status !== 'RETIRED') {
      const duplicate = await this.repository.loadActiveBySerialNumberForTenant({
        tenantId: command.tenantId,
        serialNumber: command.serialNumber,
        excludeAssetId: asset.id,
      });
      if (duplicate) {
        return err(duplicateAssetSerialNumberError(command.serialNumber.trim()));
      }
    }

    const changed = asset.updateMetadata({ serialNumber: command.serialNumber, notes: command.notes });
    if (!changed) {
      return ok(undefined);
    }

    try {
      await this.repository.save(asset);
    } catch (error) {
      if (isActiveAssetSerialConflict(error) && asset.serialNumber) {
        return err(duplicateAssetSerialNumberError(asset.serialNumber));
      }
      throw error;
    }

    return ok(undefined);
  }
}

function isActiveAssetSerialConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  const target = error.meta?.target;
  const targetFields = Array.isArray(target) ? target : [];
  const constraint = error.meta?.constraint;
  return (
    targetFields.includes('serialNumberNormalized') ||
    targetFields.includes('serial_number_normalized') ||
    target === 'v2_assets_tenant_active_serial_key' ||
    constraint === 'v2_assets_tenant_active_serial_key'
  );
}
