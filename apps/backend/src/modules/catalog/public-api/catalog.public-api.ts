import { Result } from 'neverthrow';

export type RentableItemKind = 'SINGLE' | 'PACKAGE' | 'KIT' | 'BUNDLE';

export interface CreateRentableItemOfferingInput {
  tenantId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  categoryId?: string | null;
  kind: RentableItemKind;
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

export type CatalogPublicApiErrorCode =
  | 'InvalidField'
  | 'RentableItemNotFound'
  | 'RentableItemArchived'
  | 'RentalOfferAlreadyExists'
  | 'EquipmentTypeNotFound'
  | 'RentableItemRequirementAlreadyExists';

export interface CatalogPublicApiError {
  code: CatalogPublicApiErrorCode;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
}

export abstract class CatalogPublicApi {
  abstract createRentableItemOffering(
    input: CreateRentableItemOfferingInput,
  ): Promise<Result<CreateRentableItemOfferingResult, CatalogPublicApiError>>;

  abstract createRentalOfferForRentableItem(
    input: CreateRentalOfferForRentableItemInput,
  ): Promise<Result<CreateRentalOfferForRentableItemResult, CatalogPublicApiError>>;
}
