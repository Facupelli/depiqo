import { err, ok, Result } from 'neverthrow';

export interface AccessoryDefaultInput {
  accessoryEquipmentTypeId: string;
  quantity: number;
}

export type AccessoryDefaultSetError =
  | { kind: 'self_reference'; equipmentTypeId: string }
  | { kind: 'duplicate'; accessoryEquipmentTypeId: string }
  | { kind: 'invalid_quantity'; accessoryEquipmentTypeId: string };

export function validateAccessoryDefaultSet(
  equipmentTypeId: string,
  accessories: readonly AccessoryDefaultInput[],
): Result<Set<string>, AccessoryDefaultSetError> {
  const accessoryEquipmentTypeIds = new Set<string>();

  for (const accessory of accessories) {
    const { accessoryEquipmentTypeId, quantity } = accessory;
    if (accessoryEquipmentTypeId === equipmentTypeId) {
      return err({ kind: 'self_reference', equipmentTypeId });
    }
    if (accessoryEquipmentTypeIds.has(accessoryEquipmentTypeId)) {
      return err({ kind: 'duplicate', accessoryEquipmentTypeId });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return err({ kind: 'invalid_quantity', accessoryEquipmentTypeId });
    }
    accessoryEquipmentTypeIds.add(accessoryEquipmentTypeId);
  }

  return ok(accessoryEquipmentTypeIds);
}

export function validateNonEmptyAccessoryDefaultAppend(
  accessories: readonly AccessoryDefaultInput[],
): Result<void, { kind: 'empty_append' }> {
  return accessories.length === 0 ? err({ kind: 'empty_append' }) : ok(undefined);
}
