import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { RentalAccessoryMutationError, RentalAccessoryMutations } from '../../application/rental-accessory-mutations';
import { ReplaceRentalDemandLineAccessoriesCommand } from './replace-rental-demand-line-accessories.command';
import {
  ReplaceRentalDemandLineAccessoriesError,
  replaceRentalDemandLineAccessoriesError,
} from './replace-rental-demand-line-accessories.errors';

export type ReplaceRentalDemandLineAccessoriesResult = Result<void, ReplaceRentalDemandLineAccessoriesError>;

@CommandHandler(ReplaceRentalDemandLineAccessoriesCommand)
export class ReplaceRentalDemandLineAccessoriesHandler implements ICommandHandler<
  ReplaceRentalDemandLineAccessoriesCommand,
  ReplaceRentalDemandLineAccessoriesResult
> {
  constructor(private readonly mutations: RentalAccessoryMutations) {}

  async execute(command: ReplaceRentalDemandLineAccessoriesCommand): Promise<ReplaceRentalDemandLineAccessoriesResult> {
    const { tenantId, rentalId, rentalDemandLineId, expectedVersion, accessories } = command.props;
    const result = await this.mutations.replaceDemandLineAccessories({
      tenantId,
      rentalId,
      rentalDemandLineId,
      expectedVersion,
      accessories,
    });
    if (result.isOk()) return ok(undefined);

    const error = result.error;
    const context = {
      useCase: 'ReplaceRentalDemandLineAccessories',
      tenantId,
      rentalId,
      rentalDemandLineId,
      ...(error.rentalStatus ? { rentalStatus: error.rentalStatus } : {}),
      ...(error.accessoryIndex !== undefined ? { accessoryIndex: error.accessoryIndex } : {}),
      ...(error.equipmentTypeId ? { equipmentTypeId: error.equipmentTypeId } : {}),
      ...(error.availability ? { availability: error.availability } : {}),
    };
    return err(replaceRentalDemandLineAccessoriesError(toFeatureCode(error), error.message, error.cause, context));
  }
}

function toFeatureCode(error: RentalAccessoryMutationError): ReplaceRentalDemandLineAccessoriesError['code'] {
  switch (error.code) {
    case 'RentalNotFound':
      return 'rental_commitment.rental_not_found';
    case 'RentalVersionConflict':
      return 'rental_commitment.rental_version_conflict';
    case 'RentalStatusDoesNotAllowAccessoryAssignment':
      return 'rental_commitment.rental_status_does_not_allow_accessory_assignment';
    case 'SourceRentalDemandLineNotFound':
      return 'rental_commitment.source_rental_demand_line_not_found';
    case 'InvalidAccessoryQuantity':
      return 'rental_commitment.invalid_accessory_quantity';
    case 'DuplicateAccessorySelection':
      return 'rental_commitment.duplicate_accessory_selection';
    case 'EquipmentTypeNotFound':
      return 'rental_commitment.equipment_type_not_found';
    case 'InsufficientAssetAvailability':
      return 'rental_commitment.insufficient_asset_availability';
    case 'AssetAvailabilityChanged':
      return 'rental_commitment.asset_availability_changed';
  }
}
