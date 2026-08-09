import { Result } from 'neverthrow';

import { RentalCommitmentError } from '../../rental-commitment/domain/errors/rental-commitment.errors';
import { RentableItemKind } from '../domain/rentable-item.aggregate';

export type { RentableItemKind } from '../domain/rentable-item.aggregate';

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
    kind: RentableItemKind;
    categoryId?: string;
  };
  branchId: string;
  quantity: number;
  fulfillmentRequirements: Array<{
    equipmentTypeId: string;
    equipmentTypeName?: string;
    quantityPerItem: number;
  }>;
}

export interface ResolveSelectedRentalOffersResult {
  resolvedOffers: ResolvedSelectedRentalOffer[];
}

export type ResolveRentalOffersForAvailabilityErrorCode =
  | 'RentalOfferNotFound'
  | 'RentalOfferNotRentable'
  | 'RentableItemNotActive'
  | 'InvalidFulfillmentDefinition';

export interface ResolveRentalOffersForAvailabilityError {
  code: ResolveRentalOffersForAvailabilityErrorCode;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
}

export interface ResolveRentalOffersForAvailabilityInput {
  tenantId: string;
  branchId: string;
  rentalOfferIds: string[];
}

export interface ResolveRentalOffersForAvailabilityResult {
  resolvedOffers: Array<{
    rentalOfferId: string;
    branchId: string;
    fulfillmentRequirements: Array<{
      equipmentTypeId: string;
      quantityPerItem: number;
    }>;
  }>;
}

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
  | 'EquipmentTypeNotActive'
  | 'RentableItemRequirementAlreadyExists';

export interface CatalogPublicApiError {
  code: CatalogPublicApiErrorCode;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
}

export abstract class CatalogPublicApi {
  abstract resolveSelectedRentalOffers(
    input: ResolveSelectedRentalOffersInput,
  ): Promise<Result<ResolveSelectedRentalOffersResult, RentalCommitmentError>>;

  abstract resolveRentalOffersForAvailability(
    input: ResolveRentalOffersForAvailabilityInput,
  ): Promise<Result<ResolveRentalOffersForAvailabilityResult, ResolveRentalOffersForAvailabilityError>>;

  abstract createRentableItemOffering(
    input: CreateRentableItemOfferingInput,
  ): Promise<Result<CreateRentableItemOfferingResult, CatalogPublicApiError>>;

  abstract createRentalOfferForRentableItem(
    input: CreateRentalOfferForRentableItemInput,
  ): Promise<Result<CreateRentalOfferForRentableItemResult, CatalogPublicApiError>>;
}
