export interface EquipmentTypeDisplayFact {
  equipmentTypeId: string;
  name: string;
  categoryId: string | null;
}

export interface GetEquipmentTypeDisplayFactsInput {
  tenantId: string;
  equipmentTypeIds: string[];
}

export interface AssetDisplayFact {
  assetId: string;
  serialNumber: string | null;
}

export interface GetAssetDisplayFactsInput {
  tenantId: string;
  assetIds: string[];
}

export interface OwnerDisplayFact {
  ownerId: string;
  name: string;
}

export interface GetOwnerDisplayFactsInput {
  tenantId: string;
  ownerIds: string[];
}

export abstract class AssetInventoryDisplayFacts {
  abstract getEquipmentTypeDisplayFacts(input: GetEquipmentTypeDisplayFactsInput): Promise<EquipmentTypeDisplayFact[]>;

  abstract getAssetDisplayFacts(input: GetAssetDisplayFactsInput): Promise<AssetDisplayFact[]>;

  abstract getOwnerDisplayFacts(input: GetOwnerDisplayFactsInput): Promise<OwnerDisplayFact[]>;
}
