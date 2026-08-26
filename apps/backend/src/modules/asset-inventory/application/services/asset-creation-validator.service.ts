import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  ActiveOwnerContractNotFoundError,
  AssetInventoryError,
  AssetOwnerNotFoundError,
  MultipleActiveOwnerContractsError,
} from '../../domain/errors/asset-inventory.errors';
import { AssetOwnerContractSnapshotPayload } from '../../public-api/events/asset-created.integration-event';

export interface AssetCreationValidationAssetInput {
  ownerId?: string | null;
  serialNumber?: string | null;
}

export interface AssetCreationValidationResult {
  ownerContractSnapshotsByOwnerId: Map<string, AssetOwnerContractSnapshotPayload>;
}

@Injectable()
export class AssetCreationValidatorService {
  constructor(private readonly prisma: PrismaService) {}

  async validateAssetsCanBeCreated(input: {
    tenantId: string;
    assets: AssetCreationValidationAssetInput[];
  }): Promise<Result<AssetCreationValidationResult, AssetInventoryError>> {
    const ownerValidation = await this.validateOwnersAndResolveActiveContracts(input.tenantId, input.assets);
    if (ownerValidation.isErr()) {
      return err(ownerValidation.error);
    }

    return ok({ ownerContractSnapshotsByOwnerId: ownerValidation.value });
  }

  private async validateOwnersAndResolveActiveContracts(
    tenantId: string,
    assets: AssetCreationValidationAssetInput[],
  ): Promise<Result<Map<string, AssetOwnerContractSnapshotPayload>, AssetInventoryError>> {
    const ownerIds = [
      ...new Set(
        assets.flatMap((asset) => {
          const ownerId = asset.ownerId?.trim();
          return ownerId ? [ownerId] : [];
        }),
      ),
    ];
    if (ownerIds.length === 0) {
      return ok(new Map());
    }

    const now = new Date();
    const owners = await this.prisma.client.v2AssetOwner.findMany({
      where: {
        tenantId,
        id: { in: ownerIds },
      },
      select: {
        id: true,
        contracts: {
          where: {
            assetId: null,
            validFrom: { lte: now },
            OR: [{ validTo: null }, { validTo: { gt: now } }],
          },
          select: {
            id: true,
            basis: true,
            ownerShare: true,
            rentalShare: true,
          },
        },
      },
    });
    const existingOwnerIdSet = new Set(owners.map((owner) => owner.id));
    const snapshotsByOwnerId = new Map<string, AssetOwnerContractSnapshotPayload>();

    for (const ownerId of ownerIds) {
      if (!existingOwnerIdSet.has(ownerId)) {
        return err(new AssetOwnerNotFoundError(ownerId));
      }

      const owner = owners.find((candidate) => candidate.id === ownerId);
      if (!owner || owner.contracts.length === 0) {
        return err(new ActiveOwnerContractNotFoundError(ownerId));
      }
      if (owner.contracts.length > 1) {
        return err(new MultipleActiveOwnerContractsError(ownerId));
      }

      const contract = owner.contracts[0];
      snapshotsByOwnerId.set(ownerId, {
        ownerId,
        contractId: contract.id,
        basis: contract.basis,
        ownerShare: contract.ownerShare.toNumber(),
        rentalShare: contract.rentalShare.toNumber(),
      });
    }

    return ok(snapshotsByOwnerId);
  }
}
