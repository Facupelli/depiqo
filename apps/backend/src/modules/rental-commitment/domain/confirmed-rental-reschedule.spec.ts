import { AssetBlock, AssetBlockId } from './asset-block.entity';
import { AssignedAsset, AssignedAssetId } from './assigned-asset.entity';
import { deriveConfirmedAssetBlockPeriod } from './confirmed-asset-block-period';
import {
  RentalCannotBeEditedFromStatusError,
  RentalPeriodCannotStartInPastError,
  RentalPeriodHasStartedError,
} from './errors/rental-commitment.errors';
import { ConfirmedRentalEditedDomainEvent } from './events/rental-lifecycle.domain-events';
import { RentalDemandLineId } from './ids/rental-demand-line-id';
import { RentalSelectionId } from './ids/rental-selection-id';
import { AssetBlockType, FulfillmentMethod, RentalStatus, RentableItemKind } from './rental-status';
import { Rental } from './rental.aggregate';
import { AssetId, EquipmentTypeId, RentalId } from './types/rental-commitment-ids';
import { AssignedAssetOwnershipSnapshot } from './value-objects/assigned-asset-ownership-snapshot.value-object';
import { RentalPeriod } from './value-objects/rental-period.value-object';

const operationTime = new Date('2030-01-01T08:00:00.000Z');
const originalStart = new Date('2030-01-10T10:00:00.000Z');
const originalEnd = new Date('2030-01-12T18:00:00.000Z');
const buffer = { beforeBufferMinutes: 30, afterBufferMinutes: 60 };
const tenantOwnership = AssignedAssetOwnershipSnapshot.create({ kind: 'TENANT_OWNED' })._unsafeUnwrap();
const pricePayload = {
  currency: 'USD',
  subtotal: '100.00',
  discountTotal: '10.00',
  total: '90.00',
  chargedDays: 2,
  lines: [
    {
      rentalSelectionId: 'selection-1',
      rentalOfferId: 'offer-1',
      rentableItemId: 'item-1',
      rentableItemName: 'Camera',
      quantity: 1,
      chargedUnits: 2,
      billingUnit: 'DAY' as const,
      pricePerUnit: '50.00',
      subtotal: '100.00',
      discountTotal: '10.00',
      total: '90.00',
      appliedAdjustments: [],
    },
  ],
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
  calculatedAtIso: '2030-01-01T07:00:00.000Z',
  context: 'CONFIRMED',
  calculated: pricePayload,
  final: pricePayload,
  insurance: { applied: true, rate: '0.10', amount: '9.00' },
  manualAdjustment: { targetTotal: '90.00', reason: 'Accepted quote', actorId: 'user-1' },
  totalBeforeInsurance: '90.00',
  total: '99.00',
};
const acceptedDelivery = {
  schema: 'v2.accepted-delivery',
  version: 1,
  distanceMeters: 12500,
  delivery: {
    scheduledAt: originalStart.toISOString(),
    serviceLevel: 'SPECIAL',
    basePrice: '20.00',
    surcharge: '5.00',
    total: '25.00',
  },
  collection: {
    scheduledAt: originalEnd.toISOString(),
    serviceLevel: 'NORMAL',
    basePrice: '15.00',
    surcharge: '0.00',
    total: '15.00',
  },
  currency: 'USD',
  deliveryTotal: '40.00',
  transportReservationMinutes: 45,
} as const;

function createConfirmed(fulfillmentMethod: FulfillmentMethod = FulfillmentMethod.Pickup): Rental {
  return Rental.createConfirmed({
    id: 'rental-1' as RentalId,
    tenantId: 'tenant-1',
    rentalNumber: 7,
    branchId: 'branch-1',
    rentalCustomerId: 'customer-1',
    period: new RentalPeriod(originalStart, originalEnd),
    fulfillmentMethod,
    notes: 'Preserve this note',
    insuranceSelected: true,
    bookingSnapshot: { channel: 'tenant' },
    ...(fulfillmentMethod === FulfillmentMethod.Delivery
      ? {
          deliveryDetails: {
            address: 'Main Street 1',
            formattedAddress: 'Main Street 1, City',
            latitude: 10,
            longitude: 20,
          },
          acceptedDelivery,
        }
      : {}),
    acceptedAssetBuffer: buffer,
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
        id: 'assignment-current' as AssignedAssetId,
        rentalDemandLineId: 'demand-1' as RentalDemandLineId,
        assetId: 'asset-current' as AssetId,
        ownershipSnapshot: tenantOwnership,
        createdAt: new Date('2029-12-20T10:00:00.000Z'),
      },
    ],
    confirmedAt: operationTime,
  })._unsafeUnwrap();
}

function withHistoryAndAccessoryBlocks(fulfillmentMethod: FulfillmentMethod): Rental {
  const seed = createConfirmed(fulfillmentMethod);
  const closedAt = new Date('2030-01-05T12:00:00.000Z');
  const historicalStart = new Date('2030-01-05T10:00:00.000Z');
  const closedUnreleased = AssignedAsset.reconstitute({
    id: 'assignment-history-unreleased' as AssignedAssetId,
    tenantId: seed.tenantId,
    rentalId: seed.id,
    rentalDemandLineId: 'demand-1' as RentalDemandLineId,
    assetId: 'asset-history-unreleased' as AssetId,
    ownershipSnapshot: tenantOwnership,
    effectiveFrom: historicalStart,
    effectiveUntil: closedAt,
    createdAt: new Date('2029-12-18T10:00:00.000Z'),
  });
  const closedReleased = AssignedAsset.reconstitute({
    id: 'assignment-history-released' as AssignedAssetId,
    tenantId: seed.tenantId,
    rentalId: seed.id,
    rentalDemandLineId: 'demand-1' as RentalDemandLineId,
    assetId: 'asset-history-released' as AssetId,
    ownershipSnapshot: tenantOwnership,
    effectiveFrom: historicalStart,
    effectiveUntil: closedAt,
    createdAt: new Date('2029-12-17T10:00:00.000Z'),
  });
  const historicalPeriod = deriveConfirmedAssetBlockPeriod({
    participationPeriod: new RentalPeriod(historicalStart, closedAt),
    acceptedBeforeBufferMinutes: buffer.beforeBufferMinutes,
    acceptedAfterBufferMinutes: buffer.afterBufferMinutes,
    acceptedDelivery: seed.acceptedDelivery,
  });
  const historicalUnreleasedBlock = AssetBlock.create({
    id: 'block-history-unreleased' as AssetBlockId,
    tenantId: seed.tenantId,
    rentalId: seed.id,
    assetId: closedUnreleased.assetId,
    period: historicalPeriod,
    blockType: AssetBlockType.Equipment,
  })._unsafeUnwrap();
  const historicalReleasedBlock = AssetBlock.create({
    id: 'block-history-released' as AssetBlockId,
    tenantId: seed.tenantId,
    rentalId: seed.id,
    assetId: closedReleased.assetId,
    period: historicalPeriod,
    blockType: AssetBlockType.Equipment,
    releasedAt: closedAt,
  })._unsafeUnwrap();
  const accessoryActive = AssetBlock.create({
    id: 'block-accessory-active' as AssetBlockId,
    tenantId: seed.tenantId,
    rentalId: seed.id,
    assetId: 'accessory-active' as AssetId,
    period: seed.assetBlocks[0].period,
    blockType: AssetBlockType.Accessory,
  })._unsafeUnwrap();
  const accessoryReleased = AssetBlock.create({
    id: 'block-accessory-released' as AssetBlockId,
    tenantId: seed.tenantId,
    rentalId: seed.id,
    assetId: 'accessory-released' as AssetId,
    period: seed.assetBlocks[0].period,
    blockType: AssetBlockType.Accessory,
    releasedAt: operationTime,
  })._unsafeUnwrap();

  return Rental.reconstitute({
    id: seed.id,
    tenantId: seed.tenantId,
    rentalNumber: seed.rentalNumber,
    branchId: seed.branchId,
    rentalCustomerId: seed.rentalCustomerId,
    status: seed.status,
    period: seed.period,
    fulfillmentMethod: seed.fulfillmentMethod,
    notes: seed.notes,
    insuranceSelected: seed.insuranceSelected,
    bookingSnapshot: seed.bookingSnapshot,
    deliveryDetails: seed.deliveryDetails,
    confirmedPriceSnapshot: seed.confirmedPriceSnapshot!.toJSON(),
    deliverySnapshot: seed.acceptedDelivery?.toJSON(),
    acceptedCustomerTotal: seed.acceptedCustomerTotal,
    acceptedAssetBuffer: seed.acceptedAssetBuffer,
    selections: [...seed.selections],
    demandLines: [...seed.demandLines],
    assignedAssets: [...seed.assignedAssets, closedUnreleased, closedReleased],
    assetBlocks: [
      ...seed.assetBlocks,
      historicalUnreleasedBlock,
      historicalReleasedBlock,
      accessoryActive,
      accessoryReleased,
    ],
    confirmedAt: seed.confirmedAt,
  })._unsafeUnwrap();
}

describe('Rental rescheduleConfirmedPeriod', () => {
  it.each([
    ['later start', new Date('2030-01-11T10:00:00.000Z'), new Date('2030-01-14T18:00:00.000Z')],
    ['earlier future start', new Date('2030-01-05T10:00:00.000Z'), new Date('2030-01-12T18:00:00.000Z')],
    ['end-only change', originalStart, new Date('2030-01-15T18:00:00.000Z')],
  ])('supports a successful %s', (_label, start, end) => {
    const rental = createConfirmed();
    rental.pullDomainEvents();
    const period = new RentalPeriod(start, end);

    const result = rental.rescheduleConfirmedPeriod({ period, operationTime });

    expect(result.isOk()).toBe(true);
    expect(rental.period.equals(period)).toBe(true);
  });

  it('rejects rescheduling at or after the current start', () => {
    const rental = createConfirmed();
    const period = new RentalPeriod(new Date('2030-01-15T10:00:00.000Z'), new Date('2030-01-16T10:00:00.000Z'));

    expect(
      rental.rescheduleConfirmedPeriod({ period, operationTime: originalStart })._unsafeUnwrapErr(),
    ).toBeInstanceOf(RentalPeriodHasStartedError);
  });

  it('rejects a proposed start that is not strictly after operation time', () => {
    const rental = createConfirmed();
    const period = new RentalPeriod(operationTime, new Date('2030-01-02T08:00:00.000Z'));

    expect(rental.rescheduleConfirmedPeriod({ period, operationTime })._unsafeUnwrapErr()).toBeInstanceOf(
      RentalPeriodCannotStartInPastError,
    );
  });

  it('rejects a non-confirmed rental', () => {
    const confirmed = createConfirmed();
    const draft = Rental.reconstitute({
      id: confirmed.id,
      tenantId: confirmed.tenantId,
      rentalNumber: confirmed.rentalNumber,
      branchId: confirmed.branchId,
      rentalCustomerId: confirmed.rentalCustomerId,
      status: RentalStatus.Draft,
      period: confirmed.period,
      fulfillmentMethod: FulfillmentMethod.Pickup,
      selections: [...confirmed.selections],
      demandLines: [...confirmed.demandLines],
      assignedAssets: [],
      assetBlocks: [],
    })._unsafeUnwrap();
    const period = new RentalPeriod(new Date('2030-01-11T10:00:00.000Z'), new Date('2030-01-13T18:00:00.000Z'));

    expect(draft.rescheduleConfirmedPeriod({ period, operationTime })._unsafeUnwrapErr()).toBeInstanceOf(
      RentalCannotBeEditedFromStatusError,
    );
  });

  it('reschedules Pickup without introducing delivery state', () => {
    const rental = createConfirmed(FulfillmentMethod.Pickup);
    const period = new RentalPeriod(new Date('2030-01-11T10:00:00.000Z'), new Date('2030-01-14T18:00:00.000Z'));

    rental.rescheduleConfirmedPeriod({ period, operationTime })._unsafeUnwrap();

    expect(rental.acceptedDelivery).toBeUndefined();
  });

  it('moves only Delivery schedules and preserves every accepted Delivery commercial fact', () => {
    const rental = createConfirmed(FulfillmentMethod.Delivery);
    const original = rental.acceptedDelivery!.snapshot;
    const period = new RentalPeriod(new Date('2030-01-11T10:00:00.000Z'), new Date('2030-01-14T18:00:00.000Z'));

    rental.rescheduleConfirmedPeriod({ period, operationTime })._unsafeUnwrap();

    expect(rental.acceptedDelivery!.snapshot).toEqual({
      ...original,
      delivery: { ...original.delivery, scheduledAt: period.start.toISOString() },
      collection: { ...original.collection, scheduledAt: period.end.toISOString() },
    });
  });

  it('moves open assignments and current blocks while preserving historical identities and unrelated facts', () => {
    const rental = withHistoryAndAccessoryBlocks(FulfillmentMethod.Delivery);
    rental.pullDomainEvents();
    const originalPrice = rental.confirmedPriceSnapshot!.toJSON();
    const originalTotal = rental.acceptedCustomerTotal;
    const originalSelections = rental.selections;
    const originalDemandLines = rental.demandLines;
    const originalClosedAssignments = rental.assignedAssets.filter((assignment) => !assignment.isActive);
    const originalHistoricalBlocks = rental.assetBlocks.filter((block) =>
      ['block-history-unreleased', 'block-history-released', 'block-accessory-released'].includes(block.id),
    );
    const currentAssignment = rental.currentAssignedAssets[0];
    const currentEquipmentBlock = rental.assetBlocks.find((block) => block.id === rental.assetBlocks[0].id)!;
    const currentAccessoryBlock = rental.assetBlocks.find((block) => block.id === 'block-accessory-active')!;
    const period = new RentalPeriod(new Date('2030-01-11T10:00:00.000Z'), new Date('2030-01-14T18:00:00.000Z'));
    const expectedBlockPeriod = deriveConfirmedAssetBlockPeriod({
      participationPeriod: period,
      acceptedBeforeBufferMinutes: buffer.beforeBufferMinutes,
      acceptedAfterBufferMinutes: buffer.afterBufferMinutes,
      acceptedDelivery: rental.acceptedDelivery,
    });

    rental.rescheduleConfirmedPeriod({ period, operationTime })._unsafeUnwrap();

    const movedAssignment = rental.currentAssignedAssets[0];
    expect(movedAssignment.id).toBe(currentAssignment.id);
    expect(movedAssignment.assetId).toBe(currentAssignment.assetId);
    expect(movedAssignment.ownershipSnapshot).toBe(currentAssignment.ownershipSnapshot);
    expect(movedAssignment.createdAt).toEqual(currentAssignment.createdAt);
    expect(movedAssignment.effectiveFrom).toEqual(period.start);
    expect(rental.assignedAssets.filter((assignment) => !assignment.isActive)).toEqual(originalClosedAssignments);

    const resizedEquipment = rental.assetBlocks.find((block) => block.id === currentEquipmentBlock.id)!;
    const resizedAccessory = rental.assetBlocks.find((block) => block.id === currentAccessoryBlock.id)!;
    expect(resizedEquipment.id).toBe(currentEquipmentBlock.id);
    expect(resizedEquipment.period.equals(expectedBlockPeriod)).toBe(true);
    expect(resizedAccessory.id).toBe(currentAccessoryBlock.id);
    expect(resizedAccessory.period.equals(expectedBlockPeriod)).toBe(true);
    for (const historicalBlock of originalHistoricalBlocks) {
      expect(rental.assetBlocks.find((block) => block.id === historicalBlock.id)).toBe(historicalBlock);
    }

    expect(rental.confirmedPriceSnapshot!.toJSON()).toEqual(originalPrice);
    expect(rental.acceptedCustomerTotal).toBe(originalTotal);
    expect(rental.insuranceSelected).toBe(true);
    expect(rental.notes).toBe('Preserve this note');
    expect(rental.selections).toEqual(originalSelections);
    expect(rental.demandLines).toEqual(originalDemandLines);

    const events = rental.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(ConfirmedRentalEditedDomainEvent);
    expect(events[0]).toMatchObject({ periodStart: period.start, periodEnd: period.end, occurredAt: operationTime });
  });
});
