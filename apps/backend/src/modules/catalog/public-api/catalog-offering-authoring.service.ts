import { Injectable } from '@nestjs/common';
import { Result } from 'neverthrow';

import { CreateRentalOfferForRentableItemCommand } from '../features/create-rental-offer-for-rentable-item/create-rental-offer-for-rentable-item.command';
import { CreateRentalOfferForRentableItemService } from '../features/create-rental-offer-for-rentable-item/create-rental-offer-for-rentable-item.service';
import { CreateRentableItemOfferingCommand } from '../features/create-rentable-item-offering/create-rentable-item-offering.command';
import { CreateRentableItemOfferingService } from '../features/create-rentable-item-offering/create-rentable-item-offering.service';
import {
  CatalogBranchContextUnavailableError,
  CatalogBranchDeletedError,
  CatalogBranchInactiveError,
  CatalogBranchNotFoundError,
  CatalogEquipmentTypeNotFoundError,
  CatalogError,
  CatalogInvalidFieldError,
  CatalogRentalOfferAlreadyExistsError,
  CatalogRentableItemArchivedError,
  CatalogRentableItemNotFoundError,
  CatalogRentableItemRequirementAlreadyExistsError,
} from '../domain/errors/catalog.errors';
import {
  CatalogOfferingAuthoring,
  CatalogOfferingAuthoringError,
  CreateRentalOfferForRentableItemInput,
  CreateRentalOfferForRentableItemResult,
  CreateRentableItemOfferingInput,
  CreateRentableItemOfferingResult,
} from './catalog-offering-authoring.public-api';

@Injectable()
export class CatalogOfferingAuthoringService extends CatalogOfferingAuthoring {
  constructor(
    private readonly createRentableItemOfferingService: CreateRentableItemOfferingService,
    private readonly createRentalOfferForRentableItemService: CreateRentalOfferForRentableItemService,
  ) {
    super();
  }

  async createRentableItemOffering(
    input: CreateRentableItemOfferingInput,
  ): Promise<Result<CreateRentableItemOfferingResult, CatalogOfferingAuthoringError>> {
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

    return result.mapErr(mapCatalogOfferingAuthoringError);
  }

  async createRentalOfferForRentableItem(
    input: CreateRentalOfferForRentableItemInput,
  ): Promise<Result<CreateRentalOfferForRentableItemResult, CatalogOfferingAuthoringError>> {
    const result = await this.createRentalOfferForRentableItemService.execute(
      new CreateRentalOfferForRentableItemCommand(input),
    );

    return result.mapErr(mapCatalogOfferingAuthoringError);
  }
}

function mapCatalogOfferingAuthoringError(error: CatalogError): CatalogOfferingAuthoringError {
  if (error instanceof CatalogInvalidFieldError) {
    return publicError('InvalidField', error.message, { field: error.field });
  }
  if (error instanceof CatalogRentableItemNotFoundError) {
    return publicError('RentableItemNotFound', error.message, { rentableItemId: error.rentableItemId });
  }
  if (error instanceof CatalogRentableItemArchivedError) {
    return publicError('RentableItemArchived', error.message, { rentableItemId: error.rentableItemId });
  }
  if (error instanceof CatalogRentalOfferAlreadyExistsError) {
    return publicError('RentalOfferAlreadyExists', error.message, {
      rentableItemId: error.rentableItemId,
      branchId: error.branchId,
    });
  }
  if (error instanceof CatalogEquipmentTypeNotFoundError) {
    return publicError(
      'EquipmentTypeNotFound',
      error.message,
      error.equipmentTypeId ? { equipmentTypeId: error.equipmentTypeId } : undefined,
    );
  }
  if (error instanceof CatalogRentableItemRequirementAlreadyExistsError) {
    return publicError('RentableItemRequirementAlreadyExists', error.message, {
      rentableItemId: error.rentableItemId,
      equipmentTypeId: error.equipmentTypeId,
    });
  }
  if (error instanceof CatalogBranchNotFoundError) {
    return publicError('BranchNotFound', error.message, error.branchId ? { branchId: error.branchId } : undefined);
  }
  if (error instanceof CatalogBranchInactiveError) {
    return publicError('BranchInactive', error.message, { branchId: error.branchId });
  }
  if (error instanceof CatalogBranchDeletedError) {
    return publicError('BranchDeleted', error.message, { branchId: error.branchId });
  }
  if (error instanceof CatalogBranchContextUnavailableError) {
    return publicError('BranchContextUnavailable', error.message);
  }

  throw error;
}

function publicError(
  code: CatalogOfferingAuthoringError['code'],
  message: string,
  details?: CatalogOfferingAuthoringError['details'],
): CatalogOfferingAuthoringError {
  return new CatalogOfferingAuthoringError(code, message, details);
}
