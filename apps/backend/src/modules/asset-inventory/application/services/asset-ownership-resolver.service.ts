import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';

import {
  ActiveOwnerContractNotFoundError,
  AssetInventoryError,
  AssetOwnerNotFoundError,
  MultipleActiveOwnerContractsError,
} from '../../domain/errors/asset-inventory.errors';
import type { AssetOwnerContractSnapshotPayload } from '../../public-api/events/asset-created.integration-event';

export interface AssetOwnershipResolution {
  ownerId: string | null;
  ownerContractSnapshot: AssetOwnerContractSnapshotPayload | null;
}

@Injectable()
export class AssetOwnershipResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolveOwnership(
    input: { tenantId: string; ownerId: string | null; now: Date },
    tx?: PrismaTransactionClient,
  ): Promise<Result<AssetOwnershipResolution, AssetInventoryError>> {
    const ownerId = normalizeNullableString(input.ownerId);
    if (!ownerId) {
      return ok({ ownerId: null, ownerContractSnapshot: null });
    }

    const resolutions = await this.resolveOwnerships(
      {
        tenantId: input.tenantId,
        ownerIds: [ownerId],
        now: input.now,
      },
      tx,
    );
    if (resolutions.isErr()) {
      return err(resolutions.error);
    }

    return ok(resolutions.value.get(ownerId)!);
  }

  async resolveOwnerships(
    input: { tenantId: string; ownerIds: readonly string[]; now: Date },
    tx?: PrismaTransactionClient,
  ): Promise<Result<Map<string, AssetOwnershipResolution>, AssetInventoryError>> {
    const ownerIds = [...new Set(input.ownerIds.map(normalizeNullableString).filter(isNonNull))];
    if (ownerIds.length === 0) {
      return ok(new Map());
    }

    const db = tx ?? this.prisma.client;
    const owners = await db.v2AssetOwner.findMany({
      where: {
        tenantId: input.tenantId,
        id: { in: ownerIds },
      },
      select: {
        id: true,
        contracts: {
          where: {
            assetId: null,
            validFrom: { lte: input.now },
            OR: [{ validTo: null }, { validTo: { gt: input.now } }],
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

    const ownersById = new Map(owners.map((owner) => [owner.id, owner]));
    const resolutions = new Map<string, AssetOwnershipResolution>();

    for (const ownerId of ownerIds) {
      const owner = ownersById.get(ownerId);
      if (!owner) {
        return err(new AssetOwnerNotFoundError(ownerId));
      }

      if (owner.contracts.length === 0) {
        return err(new ActiveOwnerContractNotFoundError(ownerId));
      }
      if (owner.contracts.length > 1) {
        return err(new MultipleActiveOwnerContractsError(ownerId));
      }

      const contract = owner.contracts[0];
      resolutions.set(ownerId, {
        ownerId,
        ownerContractSnapshot: {
          ownerId,
          contractId: contract.id,
          basis: contract.basis,
          ownerShare: contract.ownerShare.toNumber(),
          rentalShare: contract.rentalShare.toNumber(),
        },
      });
    }

    return ok(resolutions);
  }
}

function normalizeNullableString(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function isNonNull(value: string | null): value is string {
  return value !== null;
}
