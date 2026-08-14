import { Result } from 'neverthrow';

export const CATALOG_OFFERING_AUTHORING_RENTABLE_ITEM_KINDS = ['SINGLE', 'PACKAGE', 'KIT', 'BUNDLE'] as const;
export type CatalogOfferingAuthoringRentableItemKind = (typeof CATALOG_OFFERING_AUTHORING_RENTABLE_ITEM_KINDS)[number];

export interface CreateRentableItemOfferingInput {
  tenantId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  categoryId?: string | null;
  kind: CatalogOfferingAuthoringRentableItemKind;
  requirements: Array<{
    equipmentTypeId: string;
    quantityPerItem: number;
  }>;
  branchIds: string[];
}

export interface CreateRentableItemOfferingResult {
  rentableItemId: string;
  rentalOfferIds: string[];
}

export interface CreateRentalOfferForRentableItemInput {
  tenantId: string;
  rentableItemId: string;
  branchId: string;
}

export interface CreateRentalOfferForRentableItemResult {
  rentalOfferId: string;
}

export type CatalogOfferingAuthoringErrorCode =
  | 'InvalidField'
  | 'RentableItemNotFound'
  | 'RentableItemArchived'
  | 'RentalOfferAlreadyExists'
  | 'EquipmentTypeNotFound'
  | 'RentableItemRequirementAlreadyExists'
  | 'BranchNotFound'
  | 'BranchInactive'
  | 'BranchDeleted'
  | 'BranchContextUnavailable';

export class CatalogOfferingAuthoringError extends Error {
  constructor(
    public readonly code: CatalogOfferingAuthoringErrorCode,
    message: string,
    public readonly details?: {
      field?: string;
      rentableItemId?: string;
      rentalOfferId?: string;
      equipmentTypeId?: string;
      branchId?: string;
    },
  ) {
    super(message);
    this.name = 'CatalogOfferingAuthoringError';
  }
}

export abstract class CatalogOfferingAuthoring {
  abstract createRentableItemOffering(
    input: CreateRentableItemOfferingInput,
  ): Promise<Result<CreateRentableItemOfferingResult, CatalogOfferingAuthoringError>>;

  abstract createRentalOfferForRentableItem(
    input: CreateRentalOfferForRentableItemInput,
  ): Promise<Result<CreateRentalOfferForRentableItemResult, CatalogOfferingAuthoringError>>;
}
