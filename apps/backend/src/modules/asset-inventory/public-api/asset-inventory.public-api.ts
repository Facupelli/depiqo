import { Result } from 'neverthrow';

export interface EquipmentTypeReadModel {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface AssetReadModel {
  id: string;
  tenantId: string;
  equipmentTypeId: string;
  branchId: string;
  serialNumber?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'RETIRED';
}

export interface CreateEquipmentTypeSetupInput {
  tenantId: string;
  equipmentType: {
    name: string;
    description?: string | null;
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
  | 'InvalidEquipmentTypeField'
  | 'DuplicateEquipmentTypeName'
  | 'InvalidAssetField'
  | 'AssetOwnerNotFound'
  | 'ActiveOwnerContractNotFound'
  | 'MultipleActiveOwnerContracts'
  | 'EquipmentTypeNotFound'
  | 'EquipmentTypeNotActive'
  | 'InsufficientActiveEquipmentStock';

export interface AssetInventoryPublicApiError {
  code: AssetInventoryPublicApiErrorCode;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
}

export interface ValidateEquipmentTypeInput {
  tenantId: string;
  equipmentIds: string[];
}

export interface ValidateEquipmentTypeResult {
  equipmentIds: string[];
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

  abstract listAssetsByEquipmentTypeAndBranch(input: {
    tenantId: string;
    equipmentTypeId: string;
    branchId: string;
  }): Promise<AssetReadModel[]>;

  abstract validateEquipmentType(
    input: ValidateEquipmentTypeInput,
  ): Promise<Result<ValidateEquipmentTypeResult, AssetInventoryPublicApiError>>;

  abstract validatePackageRequirementsForBranches(
    input: ValidatePackageRequirementsForBranchesInput,
  ): Promise<Result<void, AssetInventoryPublicApiError>>;
}
