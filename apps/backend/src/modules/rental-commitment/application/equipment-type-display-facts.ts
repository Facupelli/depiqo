import { err, ok, Result } from 'neverthrow';

import { AssetInventoryDisplayFacts } from 'src/modules/asset-inventory/public-api/asset-inventory-display-facts.public-api';

import { EquipmentTypeNotFoundError } from '../domain/errors/rental-commitment.errors';

export interface ResolvedEquipmentTypeNames {
  get(equipmentTypeId: string): string;
}

class ValidatedEquipmentTypeNames implements ResolvedEquipmentTypeNames {
  constructor(private readonly names: ReadonlyMap<string, string>) {}

  get(equipmentTypeId: string): string {
    const name = this.names.get(equipmentTypeId);
    if (name === undefined) {
      throw new Error(`Equipment Type name for "${equipmentTypeId}" was not resolved.`);
    }
    return name;
  }
}

export async function resolveEquipmentTypeNames(
  assetInventory: AssetInventoryDisplayFacts,
  input: { tenantId: string; equipmentTypeIds: readonly string[] },
): Promise<Result<ResolvedEquipmentTypeNames, EquipmentTypeNotFoundError>> {
  const equipmentTypeIds = [...new Set(input.equipmentTypeIds)];
  const displayFacts = await assetInventory.getEquipmentTypeDisplayFacts({
    tenantId: input.tenantId,
    equipmentTypeIds,
  });
  const names = new Map(displayFacts.map((fact) => [fact.equipmentTypeId, fact.name]));
  const missingEquipmentTypeId = equipmentTypeIds.find((equipmentTypeId) => !names.has(equipmentTypeId));

  if (missingEquipmentTypeId) return err(new EquipmentTypeNotFoundError(missingEquipmentTypeId));

  return ok(new ValidatedEquipmentTypeNames(names));
}
