import { AssetInventoryDisplayFacts } from 'src/modules/asset-inventory/public-api/asset-inventory-display-facts.public-api';

export async function resolveEquipmentTypeNames(
  assetInventory: AssetInventoryDisplayFacts,
  input: { tenantId: string; equipmentTypeIds: readonly string[] },
): Promise<ReadonlyMap<string, string>> {
  const displayFacts = await assetInventory.getEquipmentTypeDisplayFacts({
    tenantId: input.tenantId,
    equipmentTypeIds: [...new Set(input.equipmentTypeIds)],
  });

  return new Map(displayFacts.map((fact) => [fact.equipmentTypeId, fact.name]));
}
