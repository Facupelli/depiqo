export interface GetEquipmentTypePageFactsInput {
  tenantId: string;
  search?: string;
  categoryId?: string;
  branchId?: string;
  page: number;
  pageSize: number;
}

export interface EquipmentTypePageFact {
  id: string;
  name: string;
  imageUrl: string | null;
  categoryId: string | null;
  activeUnitCount: number;
  selectedBranchUnitCount: number | null;
}

export interface EquipmentTypePageFactsResult {
  items: EquipmentTypePageFact[];
  total: number;
  page: number;
  pageSize: number;
}

export abstract class EquipmentTypePageFacts {
  abstract getPage(input: GetEquipmentTypePageFactsInput): Promise<EquipmentTypePageFactsResult>;
}
