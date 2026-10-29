import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  AssetAssignmentFact,
  AssetAssignmentFacts,
  GetAssetAssignmentFactsInput,
} from './asset-assignment-facts.public-api';

@Injectable()
export class AssetAssignmentFactsService extends AssetAssignmentFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getAssetAssignmentFacts(input: GetAssetAssignmentFactsInput): Promise<readonly AssetAssignmentFact[]> {
    const equipmentTypeIds = [...new Set(input.equipmentTypeIds)];
    if (equipmentTypeIds.length === 0) return [];

    const assets = await this.prisma.client.v2Asset.findMany({
      where: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        equipmentTypeId: { in: equipmentTypeIds },
      },
      select: {
        id: true,
        equipmentTypeId: true,
        status: true,
        ownerId: true,
      },
    });
    const ownerIds = [...new Set(assets.flatMap((asset) => (asset.ownerId === null ? [] : [asset.ownerId])))];
    const contractsByOwnerId = new Map<string, AssetAssignmentFact['ownerContract']>();

    if (ownerIds.length > 0) {
      const contracts = await this.prisma.client.v2OwnerContract.findMany({
        where: {
          tenantId: input.tenantId,
          ownerId: { in: ownerIds },
          owner: { tenantId: input.tenantId },
          assetId: null,
          validFrom: { lte: input.operationTime },
          OR: [{ validTo: null }, { validTo: { gt: input.operationTime } }],
        },
        select: {
          id: true,
          ownerId: true,
          basis: true,
          ownerShare: true,
          rentalShare: true,
        },
      });

      for (const contract of contracts) {
        if (contractsByOwnerId.has(contract.ownerId)) {
          contractsByOwnerId.set(contract.ownerId, null);
          continue;
        }

        contractsByOwnerId.set(contract.ownerId, {
          contractId: contract.id,
          basis: contract.basis,
          ownerShare: contract.ownerShare.toNumber(),
          rentalShare: contract.rentalShare.toNumber(),
        });
      }
    }

    return assets.map((asset) => ({
      assetId: asset.id,
      equipmentTypeId: asset.equipmentTypeId,
      status: asset.status,
      ownerId: asset.ownerId,
      ownerContract: asset.ownerId === null ? null : (contractsByOwnerId.get(asset.ownerId) ?? null),
    }));
  }
}
