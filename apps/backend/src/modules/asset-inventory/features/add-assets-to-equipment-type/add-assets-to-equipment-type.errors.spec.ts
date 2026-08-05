import {
  DuplicateAssetSerialNumberError,
  EquipmentTypeNotFoundError,
} from '../../domain/errors/asset-inventory.errors';
import { mapAssetInventoryError } from './add-assets-to-equipment-type.errors';

describe('mapAssetInventoryError', () => {
  it('maps a known domain error with its cause and safe context', () => {
    const cause = new DuplicateAssetSerialNumberError('SERIAL-1');

    const error = mapAssetInventoryError(cause);

    expect(error).toEqual({
      code: 'asset_inventory.duplicate_asset_serial_number',
      message: cause.message,
      cause,
      context: { serialNumber: 'SERIAL-1' },
    });
  });

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

    expect(() => mapAssetInventoryError(unknownError as never)).toThrow(unknownError);
  });
});
