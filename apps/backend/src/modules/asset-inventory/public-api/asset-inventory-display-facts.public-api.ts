import type { AssetStatusDto } from '@repo/api-contracts';

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

export interface BranchAssetDisplayFact extends AssetDisplayFact {
  status: AssetStatusDto;
  equipmentType: { id: string; name: string };
}

export interface ListBranchAssetDisplayFactsInput {
  tenantId: string;
  branchId: string;
  equipmentTypeIds?: readonly string[];
  assetIds?: readonly string[];
  page: number;
  pageSize: number;
}

export interface BranchAssetDisplayFactsPage {
  data: BranchAssetDisplayFact[];
  total: number;
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

  abstract listBranchAssetDisplayFacts(input: ListBranchAssetDisplayFactsInput): Promise<BranchAssetDisplayFactsPage>;

  abstract getOwnerDisplayFacts(input: GetOwnerDisplayFactsInput): Promise<OwnerDisplayFact[]>;
}
