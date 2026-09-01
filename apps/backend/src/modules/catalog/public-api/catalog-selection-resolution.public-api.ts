import { Result } from 'neverthrow';

export const CATALOG_RENTABLE_ITEM_KINDS = ['SINGLE', 'PACKAGE', 'KIT', 'BUNDLE'] as const;
export type CatalogRentableItemKind = (typeof CATALOG_RENTABLE_ITEM_KINDS)[number];

export interface SelectedRentalOfferInput {
  rentalOfferId: string;
  quantity: number;
}

export interface ResolveSelectedRentalOffersInput {
  tenantId: string;
  branchId: string;
  selectedOffers: SelectedRentalOfferInput[];
}

export interface ResolvedSelectedRentalOffer {
  rentalOfferId: string;
  rentableItem: {
    id: string;
    name: string;
    kind: CatalogRentableItemKind;
    categoryId?: string;
  };
  branchId: string;
  quantity: number;
  fulfillmentRequirements: Array<{
    equipmentTypeId: string;
    quantityPerItem: number;
  }>;
}

export interface ResolveSelectedRentalOffersResult {
  resolvedOffers: ResolvedSelectedRentalOffer[];
}

export interface ResolveSelectedRentalOfferRequirementsInput {
  tenantId: string;
  branchId: string;
  rentalOfferIds: string[];
}

export interface ResolvedSelectedRentalOfferRequirements {
  rentalOfferId: string;
  fulfillmentRequirements: Array<{
    equipmentTypeId: string;
    quantityPerItem: number;
  }>;
}

export interface UnavailableSelectedRentalOfferRequirements {
  rentalOfferId: string;
  code: 'RentalOfferNotFound' | 'RentalOfferNotRentable' | 'RentableItemNotActive';
  rentableItemId?: string;
}

export interface ResolveSelectedRentalOfferRequirementsResult {
  resolvedOffers: ResolvedSelectedRentalOfferRequirements[];
  unavailableOffers: UnavailableSelectedRentalOfferRequirements[];
}

export type CatalogSelectionResolutionErrorCode =
  | 'EmptySelection'
  | 'InvalidSelectionQuantity'
  | 'DuplicateRentalOfferSelection'
  | 'RentalOfferNotFound'
  | 'RentalOfferNotRentable'
  | 'RentableItemNotActive'
  | 'InvalidFulfillmentDefinition';

export class CatalogSelectionResolutionError extends Error {
  constructor(
    public readonly code: CatalogSelectionResolutionErrorCode,
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CatalogSelectionResolutionError';
  }
}

export abstract class CatalogSelectionResolution {
  abstract resolveSelectedRentalOffers(
    input: ResolveSelectedRentalOffersInput,
  ): Promise<Result<ResolveSelectedRentalOffersResult, CatalogSelectionResolutionError>>;

  abstract resolveSelectedRentalOfferRequirements(
    input: ResolveSelectedRentalOfferRequirementsInput,
  ): Promise<Result<ResolveSelectedRentalOfferRequirementsResult, CatalogSelectionResolutionError>>;
}
