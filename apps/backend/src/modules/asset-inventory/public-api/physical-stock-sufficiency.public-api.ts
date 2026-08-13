import { Result } from 'neverthrow';

export interface ValidateActiveStockSufficiencyInput {
  tenantId: string;
  branchIds: string[];
  requirements: Array<{
    equipmentTypeId: string;
    requiredQuantity: number;
  }>;
}

export type PhysicalStockSufficiencyError =
  | {
      code: 'EquipmentTypeNotFound';
      message: string;
      equipmentTypeId: string;
    }
  | {
      code: 'InsufficientActivePhysicalStock';
      message: string;
      equipmentTypeId: string;
      branchId: string;
      requiredQuantity: number;
      activeAssetCount: number;
    };

export abstract class PhysicalStockSufficiency {
  abstract validateActiveStockSufficiency(
    input: ValidateActiveStockSufficiencyInput,
  ): Promise<Result<void, PhysicalStockSufficiencyError>>;
}
