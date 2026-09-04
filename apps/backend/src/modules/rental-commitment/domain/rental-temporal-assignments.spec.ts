import { AssetBlock } from './asset-block.entity';
import { AssignedAsset, AssignedAssetId } from './assigned-asset.entity';
import {
  CurrentAssignedAssetDemandMismatchError,
  DuplicateAssignedAssetError,
} from './errors/rental-commitment.errors';
import { RentalDemandLine } from './rental-demand-line.entity';
import { RentalDemandLineId } from './ids/rental-demand-line-id';
import { RentalSelectionId } from './ids/rental-selection-id';
import { AssetBlockType, FulfillmentMethod, RentalStatus, RentableItemKind } from './rental-status';
import { RentalSelection } from './rental-selection.entity';
import { Rental } from './rental.aggregate';
import { AssetId, EquipmentTypeId, RentalId } from './types/rental-commitment-ids';
import { AssignedAssetOwnershipSnapshot } from './value-objects/assigned-asset-ownership-snapshot.value-object';
import { RentalPeriod } from './value-objects/rental-period.value-object';

const tenantOwnedSnapshot = AssignedAssetOwnershipSnapshot.create({ kind: 'TENANT_OWNED' })._unsafeUnwrap();
const start = new Date('2030-01-01T10:00:00.000Z');
const handoff = new Date('2030-01-01T11:00:00.000Z');
const end = new Date('2030-01-01T14:00:00.000Z');
const pricePayload = {
  currency: 'USD',
  subtotal: '100.00',
  discountTotal: '0.00',
  total: '100.00',
  chargedDays: 1,
  lines: [
    {
      rentalSelectionId: 'selection-1',
      rentalOfferId: 'offer-1',
      rentableItemId: 'item-1',
      rentableItemName: 'Camera',
      quantity: 1,
      chargedUnits: 1,
      billingUnit: 'DAY' as const,
      pricePerUnit: '100.00',
      subtotal: '100.00',
      discountTotal: '0.00',
      total: '100.00',
      appliedAdjustments: [],
    },
  ],
  appliedPromotions: [],
  durationPolicySnapshot: {
    timezone: 'UTC',
    dailyBillingPolicy: 'IGNORE_PARTIAL_DAY' as const,
    weekendCountsAsOne: false,
    minimumChargedDays: 0,
  },
};
const confirmedPriceSnapshot = {
  schema: 'v2.rental-price-snapshot',
  version: 2,
  calculatedAtIso: '2030-01-01T09:00:00.000Z',
  context: 'CONFIRMED',
  calculated: pricePayload,
  final: pricePayload,
  insurance: { applied: false, amount: '0.00' },
  totalBeforeInsurance: '100.00',
  total: '100.00',
};

function assignment(params: { id: string; assetId: string; effectiveFrom: Date; effectiveUntil?: Date }) {
  return AssignedAsset.reconstitute({
    id: params.id as AssignedAssetId,
    tenantId: 'tenant-1',
    rentalId: 'rental-1',
    rentalDemandLineId: 'demand-1' as RentalDemandLineId,
    assetId: params.assetId as AssetId,
    ownershipSnapshot: tenantOwnedSnapshot,
    effectiveFrom: params.effectiveFrom,
    effectiveUntil: params.effectiveUntil,
    createdAt: start,
  });
}

function reconstituteWith(assignments: AssignedAsset[], blockStart = handoff) {
  const seedResult = Rental.createConfirmed({
    id: 'rental-1' as RentalId,
    tenantId: 'tenant-1',
    rentalNumber: 1,
    branchId: 'branch-1',
    rentalCustomerId: 'customer-1',
    period: new RentalPeriod(start, end),
    fulfillmentMethod: FulfillmentMethod.Pickup,
    acceptedAssetBuffer: { beforeBufferMinutes: 0, afterBufferMinutes: 0 },
    confirmedPriceSnapshot,
    selections: [
      {
        id: 'selection-1' as RentalSelectionId,
        rentalOfferId: 'offer-1',
        rentableItemId: 'item-1',
        rentableItemNameSnapshot: 'Camera',
        rentableItemKindSnapshot: RentableItemKind.Single,
        quantity: 1,
      },
    ],
    demandLines: [
      {
        id: 'demand-1' as RentalDemandLineId,
        rentalSelectionId: 'selection-1' as RentalSelectionId,
        equipmentTypeId: 'equipment-1' as EquipmentTypeId,
        equipmentTypeNameSnapshot: 'Camera',
        quantity: 1,
      },
    ],
    assignedAssets: [
      {
        rentalDemandLineId: 'demand-1' as RentalDemandLineId,
        assetId: 'seed' as AssetId,
        ownershipSnapshot: tenantOwnedSnapshot,
      },
    ],
  });
  if (seedResult.isErr()) throw seedResult.error;
  const seed = seedResult.value;

  const blocks = assignments.map((candidate) =>
    AssetBlock.create({
      tenantId: seed.tenantId,
      rentalId: seed.id,
      assetId: candidate.assetId,
      period: new RentalPeriod(
        candidate.isActive ? blockStart : candidate.effectiveFrom,
        candidate.effectiveUntil ?? end,
      ),
      blockType: AssetBlockType.Equipment,
      releasedAt: candidate.effectiveUntil,
    })._unsafeUnwrap(),
  );

  return Rental.reconstitute({
    id: seed.id,
    tenantId: seed.tenantId,
    rentalNumber: seed.rentalNumber,
    branchId: seed.branchId,
    rentalCustomerId: seed.rentalCustomerId,
    status: RentalStatus.Confirmed,
    period: seed.period,
    fulfillmentMethod: seed.fulfillmentMethod,
    confirmedPriceSnapshot: seed.confirmedPriceSnapshot!.toJSON(),
    acceptedCustomerTotal: seed.acceptedCustomerTotal,
    acceptedAssetBuffer: seed.acceptedAssetBuffer,
    selections: [...seed.selections],
    demandLines: [...seed.demandLines],
    assignedAssets: assignments,
    assetBlocks: blocks,
  });
}

describe('Rental temporal assignments', () => {
  it('counts only open assignments for current fulfillment', () => {
    const historical = assignment({
      id: 'history-a',
      assetId: 'asset-a',
      effectiveFrom: start,
      effectiveUntil: handoff,
    });
    const current = assignment({ id: 'current-b', assetId: 'asset-b', effectiveFrom: handoff });

    const result = reconstituteWith([historical, current]);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().assignedAssets).toHaveLength(2);
    expect(result._unsafeUnwrap().currentAssignedAssets).toEqual([current]);
  });

  it('rejects an open assignment that references a removed demand line', () => {
    const validRental = reconstituteWith([
      assignment({ id: 'current-a', assetId: 'asset-a', effectiveFrom: handoff }),
    ])._unsafeUnwrap();
    const removedAt = new Date('2030-01-01T12:00:00.000Z');
    const removedSelection = RentalSelection.reconstitute({
      id: 'selection-history' as RentalSelectionId,
      tenantId: validRental.tenantId,
      rentalId: validRental.id,
      rentalOfferId: 'offer-history',
      rentableItemId: 'item-history',
      rentableItemNameSnapshot: 'Historical camera',
      rentableItemKindSnapshot: RentableItemKind.Single,
      quantity: 1,
      removedAt,
    });
    const removedDemandLine = RentalDemandLine.reconstitute({
      id: 'demand-history' as RentalDemandLineId,
      tenantId: validRental.tenantId,
      rentalId: validRental.id,
      rentalSelectionId: removedSelection.id,
      equipmentTypeId: 'equipment-history' as EquipmentTypeId,
      equipmentTypeNameSnapshot: 'Historical camera',
      quantity: 1,
      removedAt,
    });
    const invalidAssignment = AssignedAsset.reconstitute({
      id: 'current-history' as AssignedAssetId,
      tenantId: validRental.tenantId,
      rentalId: validRental.id,
      rentalDemandLineId: removedDemandLine.id,
      assetId: 'asset-history' as AssetId,
      ownershipSnapshot: tenantOwnedSnapshot,
      effectiveFrom: handoff,
    });
    const invalidBlock = AssetBlock.create({
      tenantId: validRental.tenantId,
      rentalId: validRental.id,
      assetId: invalidAssignment.assetId,
      period: new RentalPeriod(handoff, end),
      blockType: AssetBlockType.Equipment,
    })._unsafeUnwrap();

    const result = Rental.reconstitute({
      id: validRental.id,
      tenantId: validRental.tenantId,
      rentalNumber: validRental.rentalNumber,
      branchId: validRental.branchId,
      rentalCustomerId: validRental.rentalCustomerId,
      status: RentalStatus.Confirmed,
      period: validRental.period,
      fulfillmentMethod: validRental.fulfillmentMethod,
      confirmedPriceSnapshot: validRental.confirmedPriceSnapshot!.toJSON(),
      acceptedCustomerTotal: validRental.acceptedCustomerTotal,
      acceptedAssetBuffer: validRental.acceptedAssetBuffer,
      selections: [...validRental.selections, removedSelection],
      demandLines: [...validRental.demandLines, removedDemandLine],
      assignedAssets: [...validRental.assignedAssets, invalidAssignment],
      assetBlocks: [...validRental.assetBlocks, invalidBlock],
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(CurrentAssignedAssetDemandMismatchError);
  });

  it('allows the same asset in multiple closed historical rows', () => {
    const result = reconstituteWith([
      assignment({ id: 'history-a-1', assetId: 'asset-a', effectiveFrom: start, effectiveUntil: handoff }),
      assignment({
        id: 'history-a-2',
        assetId: 'asset-a',
        effectiveFrom: handoff,
        effectiveUntil: new Date('2030-01-01T12:00:00.000Z'),
      }),
      assignment({ id: 'current-b', assetId: 'asset-b', effectiveFrom: handoff }),
    ]);

    expect(result.isOk()).toBe(true);
  });

  it('rejects more than one open assignment for the same asset', () => {
    const result = reconstituteWith([
      assignment({ id: 'current-a-1', assetId: 'asset-a', effectiveFrom: handoff }),
      assignment({ id: 'current-a-2', assetId: 'asset-a', effectiveFrom: handoff }),
    ]);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(DuplicateAssignedAssetError);
  });

  it('requires the active block to equal the assignment interval through rental end', () => {
    const current = assignment({ id: 'current-b', assetId: 'asset-b', effectiveFrom: handoff });

    expect(reconstituteWith([current], handoff).isOk()).toBe(true);
    expect(reconstituteWith([current], start).isErr()).toBe(true);
  });
});
