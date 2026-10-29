export interface GetAssetAssignmentFactsInput {
  tenantId: string;
  branchId: string;
  equipmentTypeIds: readonly string[];
  operationTime: Date;
}

export interface AssetAssignmentFact {
  assetId: string;
  equipmentTypeId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'RETIRED';
  ownerId: string | null;
  ownerContract: {
    contractId: string;
    basis: 'GROSS' | 'NET';
    ownerShare: number;
    rentalShare: number;
  } | null;
}

export abstract class AssetAssignmentFacts {
  abstract getAssetAssignmentFacts(input: GetAssetAssignmentFactsInput): Promise<readonly AssetAssignmentFact[]>;
}
