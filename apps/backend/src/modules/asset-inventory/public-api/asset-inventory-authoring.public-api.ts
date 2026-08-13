import { Result } from 'neverthrow';

export interface CreateEquipmentTypeWithInitialAssetsInput {
  tenantId: string;
  equipmentType: {
    name: string;
    description?: string | null;
    categoryId?: string | null;
  };
  initialAssets?: Array<{
    branchId: string;
    serialNumber?: string | null;
    notes?: string | null;
    ownerId?: string | null;
  }>;
}

export interface CreateEquipmentTypeWithInitialAssetsResult {
  equipmentTypeId: string;
  assetIds: string[];
}

export type AssetInventoryAuthoringErrorCode =
  | 'CategoryNotFound'
  | 'CategoryInactive'
  | 'BranchNotFound'
  | 'BranchInactive'
  | 'BranchDeleted'
  | 'BranchReferenceUnavailable'
  | 'InvalidEquipmentTypeField'
  | 'DuplicateEquipmentTypeName'
  | 'InvalidAssetField'
  | 'AssetOwnerNotFound'
  | 'ActiveOwnerContractNotFound'
  | 'MultipleActiveOwnerContracts';

export interface AssetInventoryAuthoringError {
  code: AssetInventoryAuthoringErrorCode;
  message: string;
  details?: {
    field?: string;
    name?: string;
    branchId?: string;
    ownerId?: string;
  };
}

export abstract class AssetInventoryAuthoring {
  abstract createEquipmentTypeWithInitialAssets(
    input: CreateEquipmentTypeWithInitialAssetsInput,
  ): Promise<Result<CreateEquipmentTypeWithInitialAssetsResult, AssetInventoryAuthoringError>>;
}
