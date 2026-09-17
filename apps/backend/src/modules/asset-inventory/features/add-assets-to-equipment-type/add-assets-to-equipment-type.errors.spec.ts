import { describe, expect, it } from 'vitest';
import { EquipmentTypeNotFoundError } from '../../domain/errors/asset-inventory.errors';
import { mapAssetInventoryError } from './add-assets-to-equipment-type.errors';

describe('mapAssetInventoryError', () => {
  it('maps equipment type absence as an expected feature error', () => {
    const cause = new EquipmentTypeNotFoundError('equipment-type-1');

    expect(mapAssetInventoryError(cause)).toMatchObject({
      code: 'asset_inventory.equipment_type_not_found',
      cause,
      context: { equipmentTypeId: 'equipment-type-1' },
    });
  });

  it('throws unrecognized domain errors', () => {
    const unknownError = new (class extends Error {})('unexpected');

    // SAFETY: This focused test double implements every member exercised by the subject; unimplemented framework or service members are never accessed.
    expect(() => mapAssetInventoryError(unknownError as never)).toThrow(unknownError);
  });
});
