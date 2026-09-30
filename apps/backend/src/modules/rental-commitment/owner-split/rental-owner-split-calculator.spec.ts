import { describe, expect, it } from 'vitest';

import { AssetBlock } from '../domain/asset-block.entity';
import { AssignedAsset, AssignedAssetId } from '../domain/assigned-asset.entity';
import { RentalDemandLineId } from '../domain/ids/rental-demand-line-id';
import { RentalSelectionId } from '../domain/ids/rental-selection-id';
import { Rental } from '../domain/rental.aggregate';
import { AssetBlockType, FulfillmentMethod, RentalStatus, RentableItemKind } from '../domain/rental-status';
import { AssetId, EquipmentTypeId, RentalId } from '../domain/types/rental-commitment-ids';
import { AssignedAssetOwnershipSnapshot } from '../domain/value-objects/assigned-asset-ownership-snapshot.value-object';
import { OwnerContractBasis } from '../domain/value-objects/owner-contract-snapshot.value-object';
import { RentalPeriod } from '../domain/value-objects/rental-period.value-object';
import { RentalOwnerSplitCalculationError } from './owner-split-calculator-errors';
import { RentalOwnerSplitCalculator } from './rental-owner-split-calculator';

const start = new Date('2030-01-01T10:00:00.000Z');
const handoff = new Date('2030-01-01T11:00:00.000Z');
const end = new Date('2030-01-02T10:00:00.000Z');
// SAFETY: These non-empty fixture identifiers are opaque domain identifiers.
const selectionId = 'selection-1' as RentalSelectionId;
// SAFETY: These non-empty fixture identifiers are opaque domain identifiers.
const demandLineId = 'demand-1' as RentalDemandLineId;
const tenantOwned = AssignedAssetOwnershipSnapshot.create({ kind: 'TENANT_OWNED' })._unsafeUnwrap();

function thirdParty(basis = OwnerContractBasis.Net): AssignedAssetOwnershipSnapshot {
  return AssignedAssetOwnershipSnapshot.create({
    kind: 'THIRD_PARTY',
    ownerId: 'owner-1',
    contractId: 'contract-1',
    basis,
    ownerShare: '0.4',
  })._unsafeUnwrap();
}

function priceSnapshot(includeLine = true) {
  const lineTotal = '100.01';
  const line = {
    rentalSelectionId: selectionId,
    rentalOfferId: 'offer-1',
    rentableItemId: 'item-1',
    rentableItemName: 'Camera',
    quantity: 2,
    chargedUnits: 1,
    billingUnit: 'DAY' as const,
    pricePerUnit: lineTotal,
    subtotal: lineTotal,
    discountTotal: '0.00',
    total: lineTotal,
    appliedAdjustments: [],
  };
  const breakdown = {
    currency: 'USD',
    subtotal: lineTotal,
    discountTotal: '0.00',
    total: lineTotal,
    chargedDays: 1,
    durationPolicySnapshot: {
      timezone: 'UTC',
      dailyBillingPolicy: 'IGNORE_PARTIAL_DAY' as const,
      weekendCountsAsOne: false,
      minimumChargedDays: 1,
    },
    lines: includeLine ? [line] : [],
    appliedPromotions: [],
  };
  return {
    schema: 'v2.rental-price-snapshot',
    version: 2,
    calculatedAtIso: '2030-01-01T09:00:00.000Z',
    context: 'CONFIRMED',
    calculated: {
      ...breakdown,
      subtotal: '200.00',
      total: '200.00',
      lines: [{ ...line, pricePerUnit: '200.00', subtotal: '200.00', total: '200.00' }],
    },
    final: breakdown,
    insurance: { applied: false, amount: '0.00' },
    totalBeforeInsurance: lineTotal,
    total: lineTotal,
  };
}

function assignedAsset(id: string, assetId: string, ownership: AssignedAssetOwnershipSnapshot, closed = false) {
  // SAFETY: These non-empty fixture identifiers are opaque domain identifiers.
  return AssignedAsset.reconstitute({
    id: id as AssignedAssetId,
    tenantId: 'tenant-1',
    rentalId: 'rental-1',
    rentalDemandLineId: demandLineId,
    assetId: assetId as AssetId,
    ownershipSnapshot: ownership,
    effectiveFrom: start,
    effectiveUntil: closed ? handoff : undefined,
  });
}

function confirmedRental(
  options: {
    assignments?: AssignedAsset[];
    includePriceLine?: boolean;
  } = {},
): Rental {
  const assignments = options.assignments ?? [
    assignedAsset('assignment-a', 'asset-a', thirdParty()),
    assignedAsset('assignment-b', 'asset-b', tenantOwned),
  ];
  // SAFETY: These non-empty fixture identifiers are opaque domain identifiers.
  const seed = Rental.createConfirmed({
    id: 'rental-1' as RentalId,
    tenantId: 'tenant-1',
    rentalNumber: 1,
    branchId: 'branch-1',
    rentalCustomerId: 'customer-1',
    period: new RentalPeriod(start, end),
    fulfillmentMethod: FulfillmentMethod.Pickup,
    acceptedAssetBuffer: { beforeBufferMinutes: 0, afterBufferMinutes: 0 },
    confirmedPriceSnapshot: priceSnapshot(options.includePriceLine),
    selections: [
      {
        id: selectionId,
        rentalOfferId: 'offer-1',
        rentableItemId: 'item-1',
        rentableItemNameSnapshot: 'Camera',
        rentableItemKindSnapshot: RentableItemKind.Single,
        quantity: 2,
      },
    ],
    demandLines: [
      {
        id: demandLineId,
        rentalSelectionId: selectionId,
        equipmentTypeId: 'equipment-1' as EquipmentTypeId,
        equipmentTypeNameSnapshot: 'Camera',
        quantity: 2,
      },
    ],
    assignedAssets: assignments
      .filter((asset) => asset.isActive)
      .map((asset) => ({
        rentalDemandLineId: demandLineId,
        assetId: asset.assetId,
        ownershipSnapshot: asset.ownershipSnapshot,
      })),
  })._unsafeUnwrap();

  const blocks = assignments.map((asset) =>
    AssetBlock.create({
      tenantId: seed.tenantId,
      rentalId: seed.id,
      assetId: asset.assetId,
      period: new RentalPeriod(start, asset.effectiveUntil ?? end),
      blockType: AssetBlockType.Equipment,
      releasedAt: asset.effectiveUntil,
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
  })._unsafeUnwrap();
}

describe('RentalOwnerSplitCalculator', () => {
  const calculator = new RentalOwnerSplitCalculator();

  it('allocates accepted final price over tenant-owned and third-party assets before applying owner share', () => {
    const splits = calculator.calculate(confirmedRental());

    expect(splits).toEqual([
      {
        tenantId: 'tenant-1',
        rentalId: 'rental-1',
        rentalSelectionId: selectionId,
        rentalDemandLineId: demandLineId,
        assignedAssetId: 'assignment-a',
        assetId: 'asset-a',
        ownerId: 'owner-1',
        contractId: 'contract-1',
        basis: 'NET',
        ownerShare: '0.4',
        basisAmount: '50.01',
        ownerAmount: '20.00',
        currency: 'USD',
      },
    ]);
  });

  it('returns no owner splits when all current assets are tenant-owned', () => {
    const rental = confirmedRental({
      assignments: [
        assignedAsset('assignment-a', 'asset-a', tenantOwned),
        assignedAsset('assignment-b', 'asset-b', tenantOwned),
      ],
    });

    expect(calculator.calculate(rental)).toEqual([]);
  });

  it('ignores closed historical participation and recalculates from current assignments', () => {
    const rental = confirmedRental({
      assignments: [
        assignedAsset('historical', 'old-asset', thirdParty(), true),
        assignedAsset('current-a', 'asset-a', tenantOwned),
        assignedAsset('current-b', 'asset-b', thirdParty()),
      ],
    });

    expect(calculator.calculate(rental)).toEqual([
      expect.objectContaining({
        assignedAssetId: 'current-b',
        assetId: 'asset-b',
        basisAmount: '50.00',
        ownerAmount: '20.00',
      }),
    ]);
  });

  it('fails when a current selection lacks an accepted final price line', () => {
    const rental = confirmedRental({ includePriceLine: false });
    expect(() => calculator.calculate(rental)).toThrowError(RentalOwnerSplitCalculationError);
    expect(() => calculator.calculate(rental)).toThrow('Missing price line');
  });

  it('rejects an unsupported accepted owner contract basis', () => {
    const rental = confirmedRental({
      assignments: [
        assignedAsset('assignment-a', 'asset-a', thirdParty(OwnerContractBasis.Gross)),
        assignedAsset('assignment-b', 'asset-b', tenantOwned),
      ],
    });
    expect(() => calculator.calculate(rental)).toThrow('not supported in V1');
  });
});
