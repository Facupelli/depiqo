import { AssetBlock } from './asset-block.entity';
import { AssignedAsset } from './assigned-asset.entity';
import { RentalDemandLineNotFoundError, RentalInvalidFieldError } from './errors/rental-commitment.errors';
import { ConfirmedRentalEditedDomainEvent } from './events/rental-lifecycle.domain-events';
import { RentalDemandLineId } from './ids/rental-demand-line-id';
import { RentalSelectionId } from './ids/rental-selection-id';
import { RentalDemandLine } from './rental-demand-line.entity';
import { RentalSelection } from './rental-selection.entity';
import { FulfillmentMethod, RentalStatus, RentableItemKind } from './rental-status';
import { Rental } from './rental.aggregate';
import { AssetId, EquipmentTypeId, RentalId } from './types/rental-commitment-ids';
import { AssignedAssetOwnershipSnapshot } from './value-objects/assigned-asset-ownership-snapshot.value-object';
import { RentalPeriod } from './value-objects/rental-period.value-object';

const start = new Date('2030-01-10T10:00:00.000Z');
const end = new Date('2030-01-12T18:00:00.000Z');
const beforeStart = new Date('2030-01-09T10:00:00.000Z');
const duringRental = new Date('2030-01-11T12:00:00.000Z');
const laterRemoval = new Date('2030-01-11T14:00:00.000Z');
const packageSelectionId = 'package-selection' as RentalSelectionId;
const singleSelectionId = 'single-selection' as RentalSelectionId;
const lightDemandId = 'light-demand' as RentalDemandLineId;
const standDemandId = 'stand-demand' as RentalDemandLineId;
const cameraDemandId = 'camera-demand' as RentalDemandLineId;
const tenantOwnership = AssignedAssetOwnershipSnapshot.create({ kind: 'TENANT_OWNED' })._unsafeUnwrap();

const pricePayload = {
  currency: 'USD',
  subtotal: '100.00',
  discountTotal: '0.00',
  total: '100.00',
  chargedDays: 2,
  lines: [],
  appliedPromotions: [],
  durationPolicySnapshot: {
    timezone: 'UTC',
    dailyBillingPolicy: 'IGNORE_PARTIAL_DAY' as const,
    weekendCountsAsOne: false,
    minimumChargedDays: 1,
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

function createConfirmed(): Rental {
  return Rental.createConfirmed({
    id: 'rental-1' as RentalId,
    tenantId: 'tenant-1',
    rentalNumber: 1,
    branchId: 'branch-1',
    rentalCustomerId: 'customer-1',
    period: new RentalPeriod(start, end),
    fulfillmentMethod: FulfillmentMethod.Pickup,
    acceptedAssetBuffer: { beforeBufferMinutes: 30, afterBufferMinutes: 60 },
    confirmedPriceSnapshot,
    selections: [
      {
        id: packageSelectionId,
        rentalOfferId: 'package-offer',
        rentableItemId: 'package-item',
        rentableItemNameSnapshot: 'Lighting package',
        rentableItemKindSnapshot: RentableItemKind.Package,
        quantity: 1,
      },
      {
        id: singleSelectionId,
        rentalOfferId: 'single-offer',
        rentableItemId: 'single-item',
        rentableItemNameSnapshot: 'Camera',
        rentableItemKindSnapshot: RentableItemKind.Single,
        quantity: 1,
      },
    ],
    demandLines: [
      {
        id: lightDemandId,
        rentalSelectionId: packageSelectionId,
        equipmentTypeId: 'light-type' as EquipmentTypeId,
        equipmentTypeNameSnapshot: 'Light',
        quantity: 1,
      },
      {
        id: standDemandId,
        rentalSelectionId: packageSelectionId,
        equipmentTypeId: 'stand-type' as EquipmentTypeId,
        equipmentTypeNameSnapshot: 'Stand',
        quantity: 1,
      },
      {
        id: cameraDemandId,
        rentalSelectionId: singleSelectionId,
        equipmentTypeId: 'camera-type' as EquipmentTypeId,
        equipmentTypeNameSnapshot: 'Camera',
        quantity: 1,
      },
    ],
    assignedAssets: [
      { rentalDemandLineId: lightDemandId, assetId: 'light-asset' as AssetId, ownershipSnapshot: tenantOwnership },
      { rentalDemandLineId: standDemandId, assetId: 'stand-asset' as AssetId, ownershipSnapshot: tenantOwnership },
      { rentalDemandLineId: cameraDemandId, assetId: 'camera-asset' as AssetId, ownershipSnapshot: tenantOwnership },
    ],
  })._unsafeUnwrap();
}

function reconstituteFrom(
  rental: Rental,
  overrides: Partial<{
    selections: RentalSelection[];
    demandLines: RentalDemandLine[];
    assignedAssets: AssignedAsset[];
    assetBlocks: AssetBlock[];
  }> = {},
) {
  return Rental.reconstitute({
    id: rental.id,
    tenantId: rental.tenantId,
    rentalNumber: rental.rentalNumber,
    branchId: rental.branchId,
    rentalCustomerId: rental.rentalCustomerId,
    status: RentalStatus.Confirmed,
    period: rental.period,
    fulfillmentMethod: rental.fulfillmentMethod,
    confirmedPriceSnapshot: rental.confirmedPriceSnapshot!.toJSON(),
    acceptedCustomerTotal: rental.acceptedCustomerTotal,
    acceptedAssetBuffer: rental.acceptedAssetBuffer,
    selections: overrides.selections ?? [...rental.selections],
    demandLines: overrides.demandLines ?? [...rental.demandLines],
    assignedAssets: overrides.assignedAssets ?? [...rental.assignedAssets],
    assetBlocks: overrides.assetBlocks ?? [...rental.assetBlocks],
    confirmedAt: start,
  });
}

describe('Confirmed package demand line removal', () => {
  it('removes one package demand line before participation without changing its parent, siblings, price, or unrelated fulfillment', () => {
    const rental = createConfirmed();
    rental.pullDomainEvents();
    const originalPrice = rental.confirmedPriceSnapshot;
    const standAssignment = rental.currentAssignedAssets.find((item) => item.rentalDemandLineId === standDemandId);
    const cameraBlock = rental.assetBlocks.find((item) => item.assetId === 'camera-asset');

    const result = rental.removeConfirmedPackageDemandLine({ demandLineId: lightDemandId, operationTime: beforeStart });

    expect(result.isOk()).toBe(true);
    expect(rental.demandLines.find((line) => line.id === lightDemandId)?.removedAt).toEqual(beforeStart);
    expect(rental.demandLines.find((line) => line.id === standDemandId)?.isCurrent).toBe(true);
    expect(rental.selections.find((selection) => selection.id === packageSelectionId)?.isCurrent).toBe(true);
    expect(rental.currentAssignedAssets.map((item) => item.assetId)).toEqual(['stand-asset', 'camera-asset']);
    expect(rental.assetBlocks.map((item) => item.assetId)).toEqual(['stand-asset', 'camera-asset']);
    expect(rental.currentAssignedAssets.find((item) => item.rentalDemandLineId === standDemandId)).toBe(
      standAssignment,
    );
    expect(rental.assetBlocks.find((item) => item.assetId === 'camera-asset')).toBe(cameraBlock);
    expect(rental.confirmedPriceSnapshot).toBe(originalPrice);
    expect(rental.pullDomainEvents()).toEqual([expect.any(ConfirmedRentalEditedDomainEvent)]);
  });

  it('closes only target participation after it starts and shortens its block by the existing temporal rules', () => {
    const rental = createConfirmed();
    const unrelatedAssignment = rental.currentAssignedAssets.find((item) => item.assetId === 'stand-asset');
    const unrelatedBlock = rental.assetBlocks.find((item) => item.assetId === 'stand-asset');

    rental
      .removeConfirmedPackageDemandLine({ demandLineId: lightDemandId, operationTime: duringRental })
      ._unsafeUnwrap();

    const closed = rental.assignedAssets.find((item) => item.assetId === 'light-asset');
    const shortenedBlock = rental.assetBlocks.find((item) => item.assetId === 'light-asset');
    expect(closed?.effectiveUntil).toEqual(duringRental);
    expect(shortenedBlock?.isActive).toBe(true);
    expect(shortenedBlock?.period.end).toEqual(new Date('2030-01-11T13:00:00.000Z'));
    expect(rental.currentAssignedAssets.find((item) => item.assetId === 'stand-asset')).toBe(unrelatedAssignment);
    expect(rental.assetBlocks.find((item) => item.assetId === 'stand-asset')).toBe(unrelatedBlock);
  });

  it('rejects removal from a SINGLE selection', () => {
    const result = createConfirmed().removeConfirmedPackageDemandLine({
      demandLineId: cameraDemandId,
      operationTime: beforeStart,
    });

    expect(result._unsafeUnwrapErr()).toEqual(
      new RentalInvalidFieldError('demandLineId', 'must belong to a current PACKAGE selection'),
    );
  });

  it('rejects removing the last current demand line of a PACKAGE', () => {
    const rental = createConfirmed();
    rental
      .removeConfirmedPackageDemandLine({ demandLineId: lightDemandId, operationTime: beforeStart })
      ._unsafeUnwrap();

    const result = rental.removeConfirmedPackageDemandLine({ demandLineId: standDemandId, operationTime: beforeStart });

    expect(result._unsafeUnwrapErr()).toEqual(
      new RentalInvalidFieldError('demandLineId', 'PACKAGE selection must retain current demand'),
    );
  });

  it('rejects an already removed or unknown demand line as non-current', () => {
    const rental = createConfirmed();
    rental
      .removeConfirmedPackageDemandLine({ demandLineId: lightDemandId, operationTime: beforeStart })
      ._unsafeUnwrap();

    for (const demandLineId of [lightDemandId, 'missing-demand']) {
      const result = rental.removeConfirmedPackageDemandLine({ demandLineId, operationTime: beforeStart });
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(RentalDemandLineNotFoundError);
    }
  });

  it('reconstitutes a current PACKAGE with a previously removed child', () => {
    const rental = createConfirmed();
    rental
      .removeConfirmedPackageDemandLine({ demandLineId: lightDemandId, operationTime: beforeStart })
      ._unsafeUnwrap();

    expect(reconstituteFrom(rental).isOk()).toBe(true);
  });

  it('rejects a current SINGLE with a removed child', () => {
    const rental = createConfirmed();
    const demandLines = rental.demandLines.map((line) =>
      line.id === cameraDemandId ? line.removeAt(beforeStart) : line,
    );
    const assignedAssets = rental.assignedAssets.filter((item) => item.rentalDemandLineId !== cameraDemandId);
    const assetBlocks = rental.assetBlocks.filter((item) => item.assetId !== 'camera-asset');

    const result = reconstituteFrom(rental, { demandLines, assignedAssets, assetBlocks });

    expect(result._unsafeUnwrapErr()).toEqual(
      new RentalInvalidFieldError(
        'removedAt',
        `current SINGLE selection "${singleSelectionId}" cannot have removed demand`,
      ),
    );
  });

  it('rejects a removed selection with a current child', () => {
    const rental = createConfirmed();
    const selections = rental.selections.map((selection) =>
      selection.id === packageSelectionId ? selection.removeAt(beforeStart) : selection,
    );

    const result = reconstituteFrom(rental, { selections });

    expect(result._unsafeUnwrapErr()).toEqual(
      new RentalInvalidFieldError(
        'removedAt',
        `current demand line "${lightDemandId}" must belong to a current selection`,
      ),
    );
  });

  it('allows later whole-selection removal when a package child has an earlier tombstone', () => {
    const rental = createConfirmed();
    rental
      .removeConfirmedPackageDemandLine({ demandLineId: lightDemandId, operationTime: beforeStart })
      ._unsafeUnwrap();

    const result = rental.removeConfirmedSelection({
      selectionId: packageSelectionId,
      confirmedPriceSnapshot,
      operationTime: laterRemoval,
    });

    expect(result.isOk()).toBe(true);
    expect(rental.demandLines.find((line) => line.id === lightDemandId)?.removedAt).toEqual(beforeStart);
    expect(rental.demandLines.find((line) => line.id === standDemandId)?.removedAt).toEqual(laterRemoval);
    expect(rental.selections.find((selection) => selection.id === packageSelectionId)?.removedAt).toEqual(laterRemoval);
  });
});
