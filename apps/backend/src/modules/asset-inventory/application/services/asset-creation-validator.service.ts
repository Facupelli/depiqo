import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { AssetInventoryError } from '../../domain/errors/asset-inventory.errors';
import type { AssetOwnerContractSnapshotPayload } from '../../public-api/events/asset-created.integration-event';
import { AssetOwnershipResolver } from './asset-ownership-resolver.service';

export interface AssetCreationValidationAssetInput {
  ownerId?: string | null;
  serialNumber?: string | null;
}

export interface AssetCreationValidationResult {
  ownerContractSnapshotsByOwnerId: Map<string, AssetOwnerContractSnapshotPayload>;
}

@Injectable()
export class AssetCreationValidatorService {
  constructor(private readonly ownershipResolver: AssetOwnershipResolver) {}

  async validateAssetsCanBeCreated(input: {
    tenantId: string;
    assets: AssetCreationValidationAssetInput[];
  }): Promise<Result<AssetCreationValidationResult, AssetInventoryError>> {
    const ownerIds = [
      ...new Set(
        input.assets.flatMap((asset) => {
          const ownerId = asset.ownerId?.trim();
          return ownerId ? [ownerId] : [];
        }),
      ),
    ];
    const ownershipValidation = await this.ownershipResolver.resolveOwnerships({
      tenantId: input.tenantId,
      ownerIds,
      now: new Date(),
    });
    if (ownershipValidation.isErr()) {
      return err(ownershipValidation.error);
    }

    const ownerContractSnapshotsByOwnerId = new Map<string, AssetOwnerContractSnapshotPayload>();
    for (const [ownerId, ownership] of ownershipValidation.value) {
      if (ownership.ownerContractSnapshot) {
        ownerContractSnapshotsByOwnerId.set(ownerId, ownership.ownerContractSnapshot);
      }
    }

    return ok({ ownerContractSnapshotsByOwnerId });
  }
}
