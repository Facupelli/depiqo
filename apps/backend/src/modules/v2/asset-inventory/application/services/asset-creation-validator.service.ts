import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { Asset } from '../../domain/asset.entity';
import {
  ActiveOwnerContractNotFoundError,
  AssetInventoryError,
  AssetOwnerNotFoundError,
  DuplicateAssetSerialNumberError,
  MultipleActiveOwnerContractsError,
} from '../../domain/errors/asset-inventory.errors';
import { AssetOwnerContractSnapshotPayload } from '../../public-api/events/asset-created.event';

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
    equipmentTypeId: string;
    assets: AssetCreationValidationAssetInput[];
  }): Promise<Result<AssetCreationValidationResult, AssetInventoryError>> {
    const duplicateSerialNumber = this.findDuplicateSerialNumber(input.assets);
    if (duplicateSerialNumber) {
      return err(new DuplicateAssetSerialNumberError(duplicateSerialNumber));
    }

    const existingSerialValidation = await this.validateSerialNumbersAreAvailable(input);
    if (existingSerialValidation.isErr()) {
      return err(existingSerialValidation.error);
    }

    const ownerValidation = await this.validateOwnersAndResolveActiveContracts(input.tenantId, input.assets);
    if (ownerValidation.isErr()) {
      return err(ownerValidation.error);
    }

    return ok({ ownerContractSnapshotsByOwnerId: ownerValidation.value });
  }

  private findDuplicateSerialNumber(assets: AssetCreationValidationAssetInput[]): string | null {
    const seen = new Set<string>();

    for (const asset of assets) {
      if (!asset.serialNumber) {
        continue;
      }

      const normalizedSerialNumber = Asset.normalizeSerialNumberForComparison(asset.serialNumber);
      if (seen.has(normalizedSerialNumber)) {
        return asset.serialNumber;
      }

      seen.add(normalizedSerialNumber);
    }

    return null;
  }

  private async validateSerialNumbersAreAvailable(input: {
    tenantId: string;
    equipmentTypeId: string;
    assets: AssetCreationValidationAssetInput[];
  }): Promise<Result<void, AssetInventoryError>> {
    const serialNumbers = input.assets.flatMap((asset) => (asset.serialNumber ? [asset.serialNumber] : []));
    if (serialNumbers.length === 0) {
      return ok(undefined);
    }

    const normalizedSerialNumbers = new Set(serialNumbers.map(Asset.normalizeSerialNumberForComparison));

    const existingAssets = await this.prisma.client.v2Asset.findMany({
      where: {
        tenantId: input.tenantId,
        equipmentTypeId: input.equipmentTypeId,
        serialNumber: { not: null },
        deletedAt: null,
        status: { in: ['ACTIVE', 'INACTIVE'] },
      },
      select: { serialNumber: true },
    });

    const duplicate = existingAssets.find((asset) => {
      if (!asset.serialNumber) {
        return false;
      }
      return normalizedSerialNumbers.has(Asset.normalizeSerialNumberForComparison(asset.serialNumber));
    });

    if (duplicate?.serialNumber) {
      return err(new DuplicateAssetSerialNumberError(duplicate.serialNumber));
    }

    return ok(undefined);
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
