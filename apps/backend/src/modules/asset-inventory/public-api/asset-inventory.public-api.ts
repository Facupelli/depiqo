import { Result } from 'neverthrow';

export interface CreateEquipmentTypeSetupInput {
  tenantId: string;
  equipmentType: {
    name: string;
    description?: string | null;
    categoryId?: string | null;
  };
  assets?: Array<{
    branchId: string;
    serialNumber?: string | null;
    notes?: string | null;
    ownerId?: string | null;
  }>;
}

export interface CreateEquipmentTypeSetupResult {
  equipmentTypeId: string;
  assetIds: string[];
}

export type AssetInventoryPublicApiErrorCode =
  | 'CategoryNotFound'
  | 'CategoryInactive'
  | 'InvalidEquipmentTypeField'
  | 'DuplicateEquipmentTypeName'
  | 'InvalidAssetField'
  | 'AssetOwnerNotFound'
  | 'ActiveOwnerContractNotFound'
  | 'MultipleActiveOwnerContracts'
  | 'EquipmentTypeNotFound'
  | 'InsufficientActiveEquipmentStock';

export interface AssetInventoryPublicApiError {
  code: AssetInventoryPublicApiErrorCode;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
}

export interface ValidatePackageRequirementsForBranchesInput {
  tenantId: string;
  branchIds: string[];
  requirements: Array<{
    equipmentTypeId: string;
    quantityPerItem: number;
  }>;
}

export abstract class AssetInventoryPublicApi {
  abstract createEquipmentTypeSetup(
    input: CreateEquipmentTypeSetupInput,
  ): Promise<Result<CreateEquipmentTypeSetupResult, AssetInventoryPublicApiError>>;

  abstract validatePackageRequirementsForBranches(
    input: ValidatePackageRequirementsForBranchesInput,
  ): Promise<Result<void, AssetInventoryPublicApiError>>;
}
