import { AssetId, EquipmentTypeId } from '../domain/types/rental-commitment-ids';
import { OwnerContractSnapshot } from '../domain/value-objects/owner-contract-snapshot.value-object';

export enum RentalAssetOwnershipKind {
  TenantOwned = 'TENANT_OWNED',
  ThirdParty = 'THIRD_PARTY',
}

export enum RentalAssetCandidateStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Retired = 'RETIRED',
}

export interface AssetCandidate {
  readonly tenantId: string;
  readonly assetId: AssetId;
  readonly branchId: string;
  readonly equipmentTypeId: EquipmentTypeId;
  readonly assetStatus: RentalAssetCandidateStatus;
  readonly isActive: boolean;
  readonly isRentable: boolean;
  readonly equipmentTypeIsActive: boolean;
  readonly ownershipKind: RentalAssetOwnershipKind;
  readonly ownerId?: string;
  readonly ownerContractSnapshot?: OwnerContractSnapshot;
}
