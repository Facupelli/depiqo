import { Injectable } from '@nestjs/common';
import { Result } from 'neverthrow';

import { RentalCommitmentError } from '../../rental-commitment/domain/errors/rental-commitment.errors';
import { CreateRentalOfferForRentableItemCommand } from '../features/create-rental-offer-for-rentable-item/create-rental-offer-for-rentable-item.command';
import { CreateRentalOfferForRentableItemService } from '../features/create-rental-offer-for-rentable-item/create-rental-offer-for-rentable-item.service';
import { CreateRentableItemOfferingCommand } from '../features/create-rentable-item-offering/create-rentable-item-offering.command';
import { CreateRentableItemOfferingService } from '../features/create-rentable-item-offering/create-rentable-item-offering.service';
import { ResolveSelectedRentalOffersService } from '../features/resolve-selected-rental-offers/resolve-selected-rental-offers.service';
import {
  CatalogEquipmentTypeNotActiveError,
  CatalogEquipmentTypeNotFoundError,
  CatalogError,
  CatalogInvalidFieldError,
  CatalogRentalOfferAlreadyExistsError,
  CatalogRentableItemArchivedError,
  CatalogRentableItemNotFoundError,
  CatalogRentableItemRequirementAlreadyExistsError,
} from '../domain/errors/catalog.errors';
import {
  CatalogPublicApi,
  CatalogPublicApiError,
  CreateRentalOfferForRentableItemInput,
  CreateRentalOfferForRentableItemResult,
  CreateRentableItemOfferingInput,
  CreateRentableItemOfferingResult,
  ResolveSelectedRentalOffersInput,
  ResolveSelectedRentalOffersResult,
} from './catalog.public-api';

@Injectable()
export class CatalogPublicApiService extends CatalogPublicApi {
  constructor(
    private readonly createRentableItemOfferingService: CreateRentableItemOfferingService,
    private readonly createRentalOfferForRentableItemService: CreateRentalOfferForRentableItemService,
    private readonly resolveSelectedRentalOffersService: ResolveSelectedRentalOffersService,
  ) {
    super();
  }

  async createRentableItemOffering(
    input: CreateRentableItemOfferingInput,
  ): Promise<Result<CreateRentableItemOfferingResult, CatalogPublicApiError>> {
    const result = await this.createRentableItemOfferingService.execute(
      new CreateRentableItemOfferingCommand(input.tenantId, {
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl,
        categoryId: input.categoryId,
        kind: input.kind,
        requirements: input.requirements,
        branchIds: input.branchIds,
      }),
    );

    return result.mapErr(mapCatalogPublicApiError);
  }

  async createRentalOfferForRentableItem(
    input: CreateRentalOfferForRentableItemInput,
  ): Promise<Result<CreateRentalOfferForRentableItemResult, CatalogPublicApiError>> {
    const result = await this.createRentalOfferForRentableItemService.execute(
      new CreateRentalOfferForRentableItemCommand(input),
    );

    return result.mapErr(mapCatalogPublicApiError);
  }

  async resolveSelectedRentalOffers(
    input: ResolveSelectedRentalOffersInput,
  ): Promise<Result<ResolveSelectedRentalOffersResult, RentalCommitmentError>> {
    return this.resolveSelectedRentalOffersService.execute(input);
  }
}

function mapCatalogPublicApiError(error: CatalogError): CatalogPublicApiError {
  if (error instanceof CatalogInvalidFieldError) {
    return publicError('InvalidField', error, { field: error.field });
  }
  if (error instanceof CatalogRentableItemNotFoundError) {
    return publicError('RentableItemNotFound', error, { rentableItemId: error.rentableItemId });
  }
  if (error instanceof CatalogRentableItemArchivedError) {
    return publicError('RentableItemArchived', error, { rentableItemId: error.rentableItemId });
  }
  if (error instanceof CatalogRentalOfferAlreadyExistsError) {
    return publicError('RentalOfferAlreadyExists', error, {
      rentableItemId: error.rentableItemId,
      branchId: error.branchId,
    });
  }
  if (error instanceof CatalogEquipmentTypeNotFoundError) {
    return publicError('EquipmentTypeNotFound', error, { equipmentTypeId: error.equipmentTypeId });
  }
  if (error instanceof CatalogEquipmentTypeNotActiveError) {
    return publicError('EquipmentTypeNotActive', error, { equipmentTypeId: error.equipmentTypeId });
  }
  if (error instanceof CatalogRentableItemRequirementAlreadyExistsError) {
    return publicError('RentableItemRequirementAlreadyExists', error, {
      rentableItemId: error.rentableItemId,
      equipmentTypeId: error.equipmentTypeId,
    });
  }

  throw error;
}

function publicError(
  code: CatalogPublicApiError['code'],
  cause: CatalogError,
  context?: Record<string, unknown>,
): CatalogPublicApiError {
  return { code, message: cause.message, cause, context };
}
