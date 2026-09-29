export type OwnerContractBasis = 'NET' | 'GROSS';

export type AssignedAssetOwnershipSnapshotInput =
  | { kind: 'TENANT_OWNED' }
  | {
      kind: 'THIRD_PARTY';
      ownerId: string;
      contractId: string;
      basis: OwnerContractBasis;
      ownerShare: string;
    };

export type RentalOwnerSplitSelectionInput = {
  id: string;
};

export type RentalOwnerSplitDemandLineInput = {
  id: string;
  sourceSelectionId: string;
};

export type RentalOwnerSplitFulfilledAssetInput = {
  id: string;
  rentalDemandLineId: string;
  assetId: string;
  ownershipSnapshot: AssignedAssetOwnershipSnapshotInput;
};

export type RentalOwnerSplitPriceLineInput = {
  rentalSelectionId: string;
  netAmount: string;
};

export type RentalOwnerSplitDraft = {
  tenantId: string;
  rentalId: string;

  rentalSelectionId: string;
  rentalDemandLineId: string;
  assignedAssetId: string;
  assetId: string;

  ownerId: string;
  contractId: string;

  basis: 'NET';
  ownerShare: string;
  basisAmount: string;
  ownerAmount: string;

  currency: string;
};
