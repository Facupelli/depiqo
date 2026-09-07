export interface GetCatalogEquipmentTypeRentalFactsInput {
  tenantId: string;
  equipmentTypeIds: string[];
  branchId?: string;
}

export interface CatalogEquipmentTypeRentalFact {
  equipmentTypeId: string;
  standaloneCount: number;
  comboCount: number;
  standaloneRentalOfferIds: string[];
}

export abstract class CatalogEquipmentTypeRentalFacts {
  abstract getFacts(input: GetCatalogEquipmentTypeRentalFactsInput): Promise<CatalogEquipmentTypeRentalFact[]>;
}
