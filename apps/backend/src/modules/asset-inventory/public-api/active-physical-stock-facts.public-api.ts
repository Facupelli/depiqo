export interface GetActivePhysicalStockCountsInput {
  tenantId: string;
  branches: Array<{
    branchId: string;
    equipmentTypeIds: string[];
  }>;
}

export interface ActivePhysicalStockCount {
  branchId: string;
  equipmentTypeId: string;
  activeAssetCount: number;
}

export abstract class ActivePhysicalStockFacts {
  abstract getActivePhysicalStockCounts(input: GetActivePhysicalStockCountsInput): Promise<ActivePhysicalStockCount[]>;
}
