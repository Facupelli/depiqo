import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';
import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import { InventoryPublicApi } from 'src/modules/inventory/inventory.public-api';

import { CreateOrderAssetResolver } from './create-order-asset-resolver';
import { DemandUnit } from '../create-order.types';

describe('CreateOrderAssetResolver', () => {
  const period = DateRange.create(new Date('2026-03-30T10:00:00.000Z'), new Date('2026-03-31T10:00:00.000Z'));

  it('uses the provided transaction when resolving availability', async () => {
    const tx = { tx: true } as unknown as PrismaTransactionClient;
    const inventoryApi = {
      findAvailableAssetIds: jest.fn(async () => ['asset-1']),
    } as unknown as InventoryPublicApi;
    const resolver = new CreateOrderAssetResolver(inventoryApi);
    const demandUnits: DemandUnit[] = [
      {
        productTypeId: 'product-type-1',
        locationId: 'location-1',
        period,
        provenance: { type: 'PRODUCT', productTypeId: 'product-type-1' },
      },
    ];

    const result = await resolver.resolveDemand(demandUnits, tx);

    expect(result).toEqual({ unavailableItems: [], conflictGroups: [] });
    expect(demandUnits[0].resolvedAssetId).toBe('asset-1');
    expect(inventoryApi.findAvailableAssetIds).toHaveBeenCalledWith(
      {
        productTypeId: 'product-type-1',
        locationId: 'location-1',
        period,
        quantity: 1,
        excludeAssetIds: [],
      },
      tx,
    );
  });
});
