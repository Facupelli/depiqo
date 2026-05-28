export type OwnerContractBasis = 'NET' | 'GROSS';

export type RentalAssetOwnershipKind = 'TENANT_OWNED' | 'THIRD_PARTY';

export type OwnerContractSnapshotInput = {
  contractId: string;
  basis: OwnerContractBasis;
  ownerShare: string;
};

export type CalculateRentalOwnerSplitsInput = {
  tenantId: string;
  rentalId: string;
  currency: string;

  /**
   * Defaults to 2 for most currencies.
   * Keep it explicit so we can support special currencies later.
   */
  moneyScale?: number;

  selections: RentalOwnerSplitSelectionInput[];
  demandLines: RentalOwnerSplitDemandLineInput[];
  fulfilledAssets: RentalOwnerSplitFulfilledAssetInput[];
  priceLines: RentalOwnerSplitPriceLineInput[];
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
  ownershipKind: RentalAssetOwnershipKind;
  ownerId: string | null;
  ownerContractSnapshot: OwnerContractSnapshotInput | null;
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

export type CalculateRentalOwnerSplitsOutput = {
  splits: RentalOwnerSplitDraft[];
};
