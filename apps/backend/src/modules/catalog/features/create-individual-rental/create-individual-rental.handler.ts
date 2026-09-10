import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import {
  CatalogBranchContextUnavailableError,
  CatalogBranchDeletedError,
  CatalogBranchInactiveError,
  CatalogBranchNotFoundError,
  CatalogEquipmentTypeNotFoundError,
  CatalogError,
  CatalogInvalidFieldError,
} from '../../domain/errors/catalog.errors';
import { CreateRentableItemOfferingService } from '../create-rentable-item-offering/create-rentable-item-offering.service';
import { CreateRentableItemOfferingCommand } from '../create-rentable-item-offering/create-rentable-item-offering.command';
import { CreateIndividualRentalCommand } from './create-individual-rental.command';
import { CreateIndividualRentalError, createIndividualRentalError } from './create-individual-rental.errors';

export interface CreateIndividualRentalSuccess {
  rentableItemId: string;
  rentalOfferIds: string[];
}

export type CreateIndividualRentalResult = Result<CreateIndividualRentalSuccess, CreateIndividualRentalError>;

@CommandHandler(CreateIndividualRentalCommand)
export class CreateIndividualRentalHandler implements ICommandHandler<
  CreateIndividualRentalCommand,
  CreateIndividualRentalResult
> {
  constructor(private readonly createRentableItemOfferingService: CreateRentableItemOfferingService) {}

  async execute(command: CreateIndividualRentalCommand): Promise<CreateIndividualRentalResult> {
    const result = await this.createRentableItemOfferingService.execute(
      new CreateRentableItemOfferingCommand(command.tenantId, {
        name: command.name,
        description: command.description,
        imageUrl: command.imageUrl,
        categoryId: command.categoryId,
        kind: 'SINGLE',
        requirements: [
          {
            equipmentTypeId: command.equipmentTypeId,
            quantityPerItem: 1,
          },
        ],
        branchIds: command.branchIds,
      }),
    );

    if (result.isErr()) {
      return err(mapCatalogError(result.error, command));
    }

    return ok({
      rentableItemId: result.value.rentableItemId,
      rentalOfferIds: result.value.rentalOfferIds,
    });
  }
}

function mapCatalogError(error: CatalogError, command: CreateIndividualRentalCommand): CreateIndividualRentalError {
  const context = {
    useCase: 'CreateIndividualRental',
    tenantId: command.tenantId,
    equipmentTypeId: command.equipmentTypeId,
  };

  if (error instanceof CatalogInvalidFieldError) {
    return createIndividualRentalError('catalog.invalid_individual_rental', error.message, error, {
      ...context,
      field: error.field,
    });
  }
  if (error instanceof CatalogEquipmentTypeNotFoundError) {
    return createIndividualRentalError('catalog.equipment_type_not_found', error.message, error, context);
  }
  if (error instanceof CatalogBranchNotFoundError) {
    return createIndividualRentalError('catalog.branch_not_found', error.message, error, {
      ...context,
      branchId: error.branchId,
    });
  }
  if (error instanceof CatalogBranchInactiveError) {
    return createIndividualRentalError('catalog.branch_inactive', error.message, error, {
      ...context,
      branchId: error.branchId,
    });
  }
  if (error instanceof CatalogBranchDeletedError) {
    return createIndividualRentalError('catalog.branch_deleted', error.message, error, {
      ...context,
      branchId: error.branchId,
    });
  }
  if (error instanceof CatalogBranchContextUnavailableError) {
    return createIndividualRentalError('catalog.branch_context_unavailable', error.message, error, context);
  }

  throw error;
}
