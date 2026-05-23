import { Injectable } from '@nestjs/common';
import { ContractBasis } from '@repo/types';

import { InventoryPublicApi } from 'src/modules/inventory/inventory.public-api';
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
    private readonly inventoryApi: InventoryPublicApi,
    private readonly tenantApi: TenantPublicApi,
  ) {}

  async resolve(tenantId: string, bookingDate: Date, demandUnits: DemandUnit[]): Promise<OwnerContractByAssetId> {
    const resolvedAssetIds = demandUnits
      .map((unit) => unit.resolvedAssetId)
      .filter((assetId): assetId is string => assetId !== undefined);

    const assetOwnerRows = await this.inventoryApi.findAssetOwnershipByIds(tenantId, resolvedAssetIds);

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
