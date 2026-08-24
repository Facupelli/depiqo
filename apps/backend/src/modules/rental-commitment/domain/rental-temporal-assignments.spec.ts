import { AssetBlock } from './asset-block.entity';
import { AssignedAsset, AssignedAssetId } from './assigned-asset.entity';
import { DuplicateAssignedAssetError } from './errors/rental-commitment.errors';
import { RentalDemandLineId } from './ids/rental-demand-line-id';
import { RentalSelectionId } from './ids/rental-selection-id';
import { AssetBlockType, FulfillmentMethod, RentalStatus, RentableItemKind } from './rental-status';
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
  lines: [{ rentalSelectionId: 'selection-1', total: '100.00' }],
  appliedPromotions: [],
  durationPolicySnapshot: { dailyBillingPolicy: 'CALENDAR_DAY' },
};
const confirmedPriceSnapshot = {
  schema: 'v2.rental-price-snapshot',
  version: 1,
  calculatedAtIso: '2030-01-01T09:00:00.000Z',
  context: 'CONFIRMED',
  calculated: pricePayload,
  final: pricePayload,
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

  const current = assignments.find((candidate) => candidate.isActive)!;
  const block = AssetBlock.create({
    tenantId: seed.tenantId,
    rentalId: seed.id,
    assetId: current.assetId,
    period: new RentalPeriod(blockStart, end),
    blockType: AssetBlockType.Equipment,
  })._unsafeUnwrap();

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
    selections: [...seed.selections],
    demandLines: [...seed.demandLines],
    assignedAssets: assignments,
    assetBlocks: [block],
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
