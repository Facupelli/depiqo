import { describe, expect, it } from 'vitest';
import { RentalDemandLine } from './rental-demand-line.entity';
import { RentalInvalidFieldError } from './errors/rental-commitment.errors';
import { RentalSelection } from './rental-selection.entity';
import { RentableItemKind } from './rental-status';
import { RentalDemandLineId } from './ids/rental-demand-line-id';
import { RentalSelectionId } from './ids/rental-selection-id';
import { EquipmentTypeId } from './types/rental-commitment-ids';

describe('Rental selection and demand line local transitions', () => {
  const createdAt = new Date('2026-08-20T09:00:00.000Z');
  const removedAt = new Date('2026-08-21T09:00:00.000Z');
  const laterRemoval = new Date('2026-08-22T09:00:00.000Z');
  // SAFETY: These stable fixture identifiers are non-empty and are used only as opaque domain identifiers in this test.
  const selectionId = 'selection-1' as RentalSelectionId;

  const selection = () =>
    RentalSelection.reconstitute({
      id: selectionId,
      tenantId: 'tenant-1',
      rentalId: 'rental-1',
      rentalOfferId: 'offer-1',
      rentableItemId: 'item-1',
      rentableItemNameSnapshot: 'Camera',
      rentableItemKindSnapshot: RentableItemKind.Single,
      quantity: 1,
      priceSnapshot: { amount: 100 },
      createdAt,
      removedAt,
    });

  // SAFETY: These stable fixture identifiers are non-empty and are used only as opaque domain identifiers in this test.
  const demandLine = () =>
    RentalDemandLine.reconstitute({
      id: 'demand-1' as RentalDemandLineId,
      tenantId: 'tenant-1',
      rentalId: 'rental-1',
      rentalSelectionId: selectionId,
      equipmentTypeId: 'equipment-1' as EquipmentTypeId,
      equipmentTypeNameSnapshot: 'Camera',
      quantity: 1,
      removedQuantity: 1,
      createdAt,
      removedAt,
    });

  // SAFETY: These stable fixture identifiers are non-empty and are used only as opaque domain identifiers in this test.
  const reconstituteDemandLine = (removedQuantity: number, lineRemovedAt?: Date) =>
    RentalDemandLine.reconstitute({
      id: 'demand-state' as RentalDemandLineId,
      tenantId: 'tenant-1',
      rentalId: 'rental-1',
      rentalSelectionId: selectionId,
      equipmentTypeId: 'equipment-1' as EquipmentTypeId,
      equipmentTypeNameSnapshot: 'Camera',
      quantity: 3,
      removedQuantity,
      removedAt: lineRemovedAt,
    });

  it('represents current, partially suppressed, and fully removed quantities', () => {
    expect(reconstituteDemandLine(0)).toMatchObject({
      quantity: 3,
      removedQuantity: 0,
      operationalQuantity: 3,
      isCurrent: true,
    });
    expect(reconstituteDemandLine(1)).toMatchObject({
      quantity: 3,
      removedQuantity: 1,
      operationalQuantity: 2,
      isCurrent: true,
    });
    expect(reconstituteDemandLine(3, removedAt)).toMatchObject({
      quantity: 3,
      removedQuantity: 3,
      operationalQuantity: 0,
      isCurrent: false,
    });
  });

  it.each([
    [-1, undefined],
    [4, undefined],
    [3, undefined],
    [1, removedAt],
    [0.5, undefined],
  ])('rejects invalid removal state removedQuantity=%s removedAt=%s', (removedQuantity, lineRemovedAt) => {
    expect(() => reconstituteDemandLine(removedQuantity, lineRemovedAt)).toThrow(RentalInvalidFieldError);
  });

  it('creates demand lines as fully operational', () => {
    // SAFETY: These stable fixture identifiers are non-empty and are used only as opaque domain identifiers in this test.
    const created = RentalDemandLine.create({
      tenantId: 'tenant-1',
      rentalId: 'rental-1',
      rentalSelectionId: selectionId,
      equipmentTypeId: 'equipment-1' as EquipmentTypeId,
      equipmentTypeNameSnapshot: 'Camera',
      quantity: 3,
    })._unsafeUnwrap();

    expect(created).toMatchObject({ removedQuantity: 0, operationalQuantity: 3, isCurrent: true });
    expect(created.removedAt).toBeUndefined();
  });

  it('changes quantity without making historical children current', () => {
    const changedSelection = selection().changeQuantity(2)._unsafeUnwrap();
    const changedDemandLine = demandLine().changeQuantity(2)._unsafeUnwrap();

    expect(changedSelection).toMatchObject({ id: selectionId, quantity: 2, isCurrent: false });
    expect(changedSelection.createdAt).toEqual(createdAt);
    expect(changedSelection.removedAt).toEqual(removedAt);
    expect(changedDemandLine).toMatchObject({
      id: 'demand-1',
      quantity: 2,
      removedQuantity: 2,
      isCurrent: false,
    });
    expect(changedDemandLine.createdAt).toEqual(createdAt);
    expect(changedDemandLine.removedAt).toEqual(removedAt);
  });

  it('rejects reducing quantity below removedQuantity', () => {
    const result = reconstituteDemandLine(2).changeQuantity(1);

    expect(result._unsafeUnwrapErr()).toEqual(
      new RentalInvalidFieldError('quantity', 'must not be lower than removedQuantity'),
    );
  });

  it('rejects reducing a current partially suppressed line to its removedQuantity', () => {
    const result = reconstituteDemandLine(1).changeQuantity(1);

    expect(result._unsafeUnwrapErr()).toEqual(
      new RentalInvalidFieldError('quantity', 'must be greater than removedQuantity for a current line'),
    );
  });

  it('keeps the original tombstone when removal is repeated', () => {
    expect(selection().removeAt(laterRemoval).removedAt).toEqual(removedAt);
    expect(demandLine().removeAt(laterRemoval).removedAt).toEqual(removedAt);
  });

  it('partially restores a current demand line without changing its identity or accepted facts', () => {
    const original = reconstituteDemandLine(2);
    const restored = original.restore(1)._unsafeUnwrap();

    expect(restored).toMatchObject({
      id: original.id,
      rentalSelectionId: original.rentalSelectionId,
      equipmentTypeId: original.equipmentTypeId,
      equipmentTypeNameSnapshot: original.equipmentTypeNameSnapshot,
      quantity: original.quantity,
      removedQuantity: 1,
      operationalQuantity: 2,
      isCurrent: true,
    });
    expect(restored.removedAt).toBeUndefined();
  });

  it('partially restores a fully removed demand line and clears its tombstone', () => {
    const restored = reconstituteDemandLine(3, removedAt).restore(1)._unsafeUnwrap();

    expect(restored).toMatchObject({ removedQuantity: 2, operationalQuantity: 1, isCurrent: true });
    expect(restored.removedAt).toBeUndefined();
  });

  it('restores all remaining suppression', () => {
    const restored = reconstituteDemandLine(1).restore(1)._unsafeUnwrap();

    expect(restored).toMatchObject({ removedQuantity: 0, operationalQuantity: 3, isCurrent: true });
    expect(restored.removedAt).toBeUndefined();
  });

  it.each([0, -1, 4])('rejects invalid restoration quantity %s', (quantity) => {
    expect(demandLine().restore(quantity)._unsafeUnwrapErr()).toBeInstanceOf(RentalInvalidFieldError);
  });

  it('rejects restoration when fully operational', () => {
    expect(reconstituteDemandLine(0).restore(1)._unsafeUnwrapErr()).toEqual(
      new RentalInvalidFieldError('quantity', 'must not exceed removedQuantity'),
    );
  });
});
