import Decimal from 'decimal.js';

import { GetRentalDetailHandler } from './get-rental-detail.handler';
import { GetRentalDetailQuery } from './get-rental-detail.query';

const removedAt = new Date('2030-01-15T12:00:00.000Z');

function rentalRecord() {
  return {
    id: 'rental-1',
    rentalNumber: 1,
    status: 'CONFIRMED' as const,
    source: 'STAFF' as const,
    notes: null,
    insuranceSelected: false,
    fulfillmentMethod: 'PICKUP' as const,
    periodStart: new Date('2030-02-01T10:00:00.000Z'),
    periodEnd: new Date('2030-02-03T10:00:00.000Z'),
    priceSnapshot: null,
    deliverySnapshot: null,
    acceptedCustomerTotal: null,
    version: 2,
    createdAt: new Date('2030-01-01T10:00:00.000Z'),
    updatedAt: new Date('2030-01-15T12:00:00.000Z'),
    cancelledAt: null,
    confirmedAt: null,
    branchId: 'branch-1',
    customerId: null,
    deliveryDetails: null,
    selections: [
      {
        id: 'package-selection',
        rentalOfferId: 'package-offer',
        rentableItemId: 'package-item',
        rentableItemNameSnapshot: 'Pack Iluminación',
        rentableItemKindSnapshot: 'PACKAGE' as const,
        quantity: 1,
        priceSnapshot: null,
        demandLines: [
          {
            id: 'demand-a',
            rentalSelectionId: 'package-selection',
            equipmentTypeId: 'type-a',
            equipmentTypeNameSnapshot: 'Nanlite',
            quantity: 1,
            removedQuantity: 0,
            assignedAssets: [{ assetId: 'asset-a' }],
          },
          {
            id: 'demand-c',
            rentalSelectionId: 'package-selection',
            equipmentTypeId: 'type-c',
            equipmentTypeNameSnapshot: 'Softbox',
            quantity: 3,
            removedQuantity: 1,
            assignedAssets: [{ assetId: 'asset-c' }],
          },
        ],
      },
      {
        id: 'single-selection',
        rentalOfferId: 'single-offer',
        rentableItemId: 'single-item',
        rentableItemNameSnapshot: 'Camera',
        rentableItemKindSnapshot: 'SINGLE' as const,
        quantity: 1,
        priceSnapshot: null,
        demandLines: [],
      },
    ],
    ownerSplits: [
      {
        ownerId: 'owner-1',
        rentalDemandLineId: 'demand-a',
        ownerAmount: new Decimal('25.00'),
        currency: 'USD',
      },
    ],
    accessorySelections: [
      {
        id: 'accessory-1',
        sourceRentalDemandLineId: 'demand-a',
        equipmentTypeId: 'accessory-type',
        equipmentTypeNameSnapshot: 'Battery',
        quantity: 1,
        assignments: [{ assetId: 'accessory-asset' }],
      },
    ],
  };
}

function createHandler(removedDemandLines: object[]) {
  const findFirst = jest.fn().mockResolvedValue(rentalRecord());
  const findMany = jest.fn().mockResolvedValue(removedDemandLines);
  const handler = new GetRentalDetailHandler(
    { client: { v2Rental: { findFirst }, v2RentalDemandLine: { findMany } } } as any,
    {
      getOwnerDisplayFacts: jest.fn().mockResolvedValue([{ ownerId: 'owner-1', name: 'Owner One' }]),
    } as any,
    {
      getBranchFacts: jest.fn().mockResolvedValue({
        isErr: () => false,
        value: { branchId: 'branch-1', displayName: 'Central', branchTimezone: 'UTC' },
      }),
    } as any,
    { getRetainedRentalCustomerProfileFacts: jest.fn() } as any,
  );
  return { handler, findFirst, findMany };
}

describe('GetRentalDetailHandler removed package demand', () => {
  it('keeps current operational presentation separate from removed package children', async () => {
    const removedLine = {
      id: 'demand-b',
      rentalSelectionId: 'package-selection',
      equipmentTypeId: 'type-b',
      equipmentTypeNameSnapshot: 'Amaran snapshot',
      quantity: 3,
      removedAt,
    };
    const { handler, findFirst, findMany } = createHandler([removedLine]);

    const result = await handler.execute(new GetRentalDetailQuery('tenant-1', 'rental-1'));

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.selections[0]).toMatchObject({
      id: 'package-selection',
      demandLines: [
        { id: 'demand-a', quantity: 1, removedQuantity: 0, assignedAssets: [{ assetId: 'asset-a' }] },
        { id: 'demand-c', quantity: 2, removedQuantity: 1, assignedAssets: [{ assetId: 'asset-c' }] },
      ],
      removedDemandLines: [
        {
          id: 'demand-b',
          rentalSelectionId: 'package-selection',
          equipmentTypeId: 'type-b',
          equipmentTypeName: 'Amaran snapshot',
          quantity: 3,
          removedAt: removedAt.toISOString(),
        },
      ],
    });
    expect(result.value.selections[1]?.removedDemandLines).toEqual([]);
    expect(result.value.accessories).toEqual([
      expect.objectContaining({ id: 'accessory-1', assignedAssets: [{ assetId: 'accessory-asset' }] }),
    ]);
    expect(result.value.ownerPayouts).toEqual([
      {
        ownerId: 'owner-1',
        ownerName: 'Owner One',
        currency: 'USD',
        total: '25',
        lines: [{ rentalDemandLineId: 'demand-a', equipmentName: 'Nanlite', quantity: 1 }],
      },
    ]);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          selections: expect.objectContaining({ where: { removedAt: null } }),
        }),
      }),
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          rentalId: 'rental-1',
          removedAt: { not: null },
          rentalSelection: { removedAt: null, rentableItemKindSnapshot: 'PACKAGE' },
        },
      }),
    );
  });

  it('returns a restored line to current demand and removes its historical representation', async () => {
    const record = rentalRecord();
    record.selections[0]!.demandLines.push({
      id: 'demand-b',
      rentalSelectionId: 'package-selection',
      equipmentTypeId: 'type-b',
      equipmentTypeNameSnapshot: 'Amaran snapshot',
      quantity: 1,
      removedQuantity: 0,
      assignedAssets: [{ assetId: 'replacement-asset' }],
    });
    const { handler, findFirst } = createHandler([]);
    findFirst.mockResolvedValue(record);

    const result = await handler.execute(new GetRentalDetailQuery('tenant-1', 'rental-1'));

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.selections[0]?.demandLines).toContainEqual(
      expect.objectContaining({ id: 'demand-b', assignedAssets: [{ assetId: 'replacement-asset' }] }),
    );
    expect(result.value.selections[0]?.removedDemandLines).toEqual([]);
  });
});
