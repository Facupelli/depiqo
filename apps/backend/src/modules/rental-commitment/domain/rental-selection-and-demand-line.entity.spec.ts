import { RentalDemandLine } from './rental-demand-line.entity';
import { RentalSelection } from './rental-selection.entity';
import { RentableItemKind } from './rental-status';
import { RentalDemandLineId } from './ids/rental-demand-line-id';
import { RentalSelectionId } from './ids/rental-selection-id';
import { EquipmentTypeId } from './types/rental-commitment-ids';

describe('Rental selection and demand line local transitions', () => {
  const createdAt = new Date('2026-08-20T09:00:00.000Z');
  const removedAt = new Date('2026-08-21T09:00:00.000Z');
  const laterRemoval = new Date('2026-08-22T09:00:00.000Z');
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

  const demandLine = () =>
    RentalDemandLine.reconstitute({
      id: 'demand-1' as RentalDemandLineId,
      tenantId: 'tenant-1',
      rentalId: 'rental-1',
      rentalSelectionId: selectionId,
      equipmentTypeId: 'equipment-1' as EquipmentTypeId,
      equipmentTypeNameSnapshot: 'Camera',
      quantity: 1,
      createdAt,
      removedAt,
    });

  it('changes quantity without making historical children current', () => {
    const changedSelection = selection().changeQuantity(2)._unsafeUnwrap();
    const changedDemandLine = demandLine().changeQuantity(2)._unsafeUnwrap();

    expect(changedSelection).toMatchObject({ id: selectionId, quantity: 2, isCurrent: false });
    expect(changedSelection.createdAt).toEqual(createdAt);
    expect(changedSelection.removedAt).toEqual(removedAt);
    expect(changedDemandLine).toMatchObject({ id: 'demand-1', quantity: 2, isCurrent: false });
    expect(changedDemandLine.createdAt).toEqual(createdAt);
    expect(changedDemandLine.removedAt).toEqual(removedAt);
  });

  it('keeps the original tombstone when removal is repeated', () => {
    expect(selection().removeAt(laterRemoval).removedAt).toEqual(removedAt);
    expect(demandLine().removeAt(laterRemoval).removedAt).toEqual(removedAt);
  });
});
