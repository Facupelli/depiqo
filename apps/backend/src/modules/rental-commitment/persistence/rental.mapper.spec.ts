import { describe, expect, it } from 'vitest';
import { Prisma } from 'src/generated/prisma/client';

import { AssignedAsset, AssignedAssetId } from '../domain/assigned-asset.entity';
import { RentalDemandLine } from '../domain/rental-demand-line.entity';
import { RentalDemandLineId } from '../domain/ids/rental-demand-line-id';
import { RentalSelectionId } from '../domain/ids/rental-selection-id';
import { AssetId, EquipmentTypeId } from '../domain/types/rental-commitment-ids';
import { AssignedAssetOwnershipSnapshot } from '../domain/value-objects/assigned-asset-ownership-snapshot.value-object';
import { RentalMapper, RentalPersistenceRecord } from './rental.mapper';

describe('RentalMapper demand-line persistence', () => {
  // SAFETY: These stable fixture identifiers are non-empty and are used only as opaque domain identifiers in this test.
  const partialLine = RentalDemandLine.reconstitute({
    id: 'demand-1' as RentalDemandLineId,
    tenantId: 'tenant-1',
    rentalId: 'rental-1',
    rentalSelectionId: 'selection-1' as RentalSelectionId,
    equipmentTypeId: 'equipment-1' as EquipmentTypeId,
    equipmentTypeNameSnapshot: 'Camera',
    quantity: 3,
    removedQuantity: 1,
  });

  it('writes removedQuantity in create and update data', () => {
    expect(RentalMapper.toDemandLineCreateData(partialLine)).toMatchObject({ removedQuantity: 1 });
    expect(RentalMapper.toDemandLineUpdateData(partialLine)).toMatchObject({ removedQuantity: 1 });
  });

  it('reconstitutes the persisted removedQuantity without inferring it from removedAt', () => {
    const now = new Date('2030-01-01T10:00:00.000Z');
    const record: RentalPersistenceRecord = {
      id: 'rental-1',
      tenantId: 'tenant-1',
      rentalNumber: 1,
      branchId: 'branch-1',
      customerId: null,
      status: 'DRAFT',
      acceptedBeforeBufferMinutes: null,
      acceptedAfterBufferMinutes: null,
      deliverySnapshot: null,
      acceptedCustomerTotal: null,
      fulfillmentMethod: 'PICKUP',
      notes: null,
      insuranceSelected: false,
      bookingSnapshot: null,
      periodStart: now,
      periodEnd: new Date('2030-01-02T10:00:00.000Z'),
      priceSnapshot: null,
      source: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      confirmedAt: null,
      selections: [
        {
          id: 'selection-1',
          tenantId: 'tenant-1',
          rentalId: 'rental-1',
          rentalOfferId: 'offer-1',
          rentableItemId: 'item-1',
          rentableItemNameSnapshot: 'Kit',
          rentableItemKindSnapshot: 'PACKAGE',
          quantity: 1,
          priceSnapshot: Prisma.JsonNull,
          createdAt: now,
          removedAt: null,
        },
      ],
      demandLines: [
        {
          id: 'demand-1',
          tenantId: 'tenant-1',
          rentalId: 'rental-1',
          rentalSelectionId: 'selection-1',
          equipmentTypeId: 'equipment-1',
          equipmentTypeNameSnapshot: 'Camera',
          quantity: 3,
          removedQuantity: 1,
          createdAt: now,
          removedAt: null,
        },
      ],
      assignedAssets: [],
      assetBlocks: [],
      deliveryDetails: null,
    };

    expect(RentalMapper.toDomain(record).demandLines[0]).toMatchObject({
      removedQuantity: 1,
      operationalQuantity: 2,
      isCurrent: true,
    });
  });
});

describe('RentalMapper assigned asset persistence', () => {
  it('preserves temporal fields, identity, and createdAt for delete-and-recreate persistence', () => {
    // SAFETY: These stable fixture identifiers are non-empty and are used only as opaque domain identifiers in this test.
    const assignment = AssignedAsset.reconstitute({
      id: 'assignment-1' as AssignedAssetId,
      tenantId: 'tenant-1',
      rentalId: 'rental-1',
      rentalDemandLineId: 'demand-1' as RentalDemandLineId,
      assetId: 'asset-1' as AssetId,
      ownershipSnapshot: AssignedAssetOwnershipSnapshot.create({ kind: 'TENANT_OWNED' })._unsafeUnwrap(),
      effectiveFrom: new Date('2030-01-01T10:00:00.000Z'),
      effectiveUntil: new Date('2030-01-01T11:00:00.000Z'),
      createdAt: new Date('2029-12-01T10:00:00.000Z'),
    });

    expect(RentalMapper.toAssignedAssetCreateData(assignment)).toEqual({
      id: assignment.id,
      tenantId: assignment.tenantId,
      rentalId: assignment.rentalId,
      rentalDemandLineId: assignment.rentalDemandLineId,
      assetId: assignment.assetId,
      ownershipSnapshot: { kind: 'TENANT_OWNED' },
      effectiveFrom: assignment.effectiveFrom,
      effectiveUntil: assignment.effectiveUntil,
      createdAt: assignment.createdAt,
    });
  });
});
