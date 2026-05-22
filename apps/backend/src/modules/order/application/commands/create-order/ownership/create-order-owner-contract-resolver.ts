import { Injectable } from '@nestjs/common';
import { ContractBasis } from '@repo/types';

import { PrismaService } from 'src/core/database/prisma.service';
import { TenantPublicApi } from 'src/modules/tenant/tenant.public-api';

import { NoActiveContractForAssetError } from '../../../../domain/errors/order.errors';
import { DemandUnit } from '../create-order.types';

export type OwnerContractByAssetId = Map<
  string,
  {
    contractId: string;
    ownerId: string;
    ownerShare: string;
    rentalShare: string;
    basis: ContractBasis;
  }
>;

@Injectable()
export class CreateOrderOwnerContractResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantApi: TenantPublicApi,
  ) {}

  async resolve(tenantId: string, bookingDate: Date, demandUnits: DemandUnit[]): Promise<OwnerContractByAssetId> {
    const resolvedAssetIds = demandUnits
      .map((unit) => unit.resolvedAssetId)
      .filter((assetId): assetId is string => assetId !== undefined);

    const assetOwnerRows = await this.prisma.client.asset.findMany({
      where: { id: { in: resolvedAssetIds } },
      select: { id: true, ownerId: true },
    });

    const ownerByAssetId = new Map(assetOwnerRows.map((asset) => [asset.id, asset.ownerId]));
    const contractByAssetId: OwnerContractByAssetId = new Map();

    for (const assetId of resolvedAssetIds) {
      const ownerId = ownerByAssetId.get(assetId) ?? null;
      if (!ownerId) {
        continue;
      }

      const contract = await this.tenantApi.findActiveOwnerContract({
        tenantId,
        ownerId,
        assetId,
        date: bookingDate,
      });

      if (!contract) {
        throw new NoActiveContractForAssetError(assetId, ownerId);
      }

      contractByAssetId.set(assetId, {
        ...contract,
        basis: contract.basis as ContractBasis,
      });
    }

    return contractByAssetId;
  }
}
