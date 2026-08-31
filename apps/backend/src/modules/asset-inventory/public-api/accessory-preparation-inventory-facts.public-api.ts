export interface GetAccessoryPreparationInventoryFactsInput {
  tenantId: string;
  branchId: string;
  sourceEquipmentTypeIds: string[];
  operationTime: Date;
}

export interface AccessoryDefaultInventoryFact {
  sourceEquipmentTypeId: string;
  accessoryEquipmentTypeId: string;
  accessoryEquipmentTypeName: string;
  quantityPerUnit: number;
}

export interface EligibleAccessoryAssetInventoryFact {
  assetId: string;
  equipmentTypeId: string;
}

export interface AccessoryPreparationInventoryFactsResult {
  defaults: AccessoryDefaultInventoryFact[];
  eligibleAssets: EligibleAccessoryAssetInventoryFact[];
}

export abstract class AccessoryPreparationInventoryFacts {
  abstract getAccessoryPreparationInventoryFacts(
    input: GetAccessoryPreparationInventoryFactsInput,
  ): Promise<AccessoryPreparationInventoryFactsResult>;
}
