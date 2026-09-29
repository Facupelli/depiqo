import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { RentalAccessoryMutationError, RentalAccessoryMutations } from '../../application/rental-accessory-mutations';
import { AssignRentalAccessoriesCommand } from './assign-rental-accessories.command';
import { assignRentalAccessoriesError, AssignRentalAccessoriesError } from './assign-rental-accessories.errors';

export type AssignRentalAccessoriesResult = Result<void, AssignRentalAccessoriesError>;

@CommandHandler(AssignRentalAccessoriesCommand)
export class AssignRentalAccessoriesHandler implements ICommandHandler<
  AssignRentalAccessoriesCommand,
  AssignRentalAccessoriesResult
> {
  constructor(private readonly mutations: RentalAccessoryMutations) {}

  async execute(command: AssignRentalAccessoriesCommand): Promise<AssignRentalAccessoriesResult> {
    const result = await this.mutations.replaceRentalAccessories(command);
    if (result.isOk()) return ok(undefined);

    const error = result.error;
    const context = {
      useCase: 'AssignRentalAccessories',
      tenantId: command.tenantId,
      rentalId: command.rentalId,
      ...(error.rentalStatus ? { rentalStatus: error.rentalStatus } : {}),
      ...(error.accessoryIndex !== undefined ? { accessoryIndex: error.accessoryIndex } : {}),
      ...(error.equipmentTypeId ? { equipmentTypeId: error.equipmentTypeId } : {}),
      ...(error.availability ? { availability: error.availability } : {}),
    };
    return err(assignRentalAccessoriesError(toFeatureCode(error), error.message, error.cause, context));
  }
}

function toFeatureCode(error: RentalAccessoryMutationError): AssignRentalAccessoriesError['code'] {
  switch (error.code) {
    case 'RentalNotFound':
      return 'rental_commitment.rental_not_found';
    case 'RentalVersionConflict':
      return 'rental_commitment.rental_version_conflict';
    case 'RentalStatusDoesNotAllowAccessoryAssignment':
      return 'rental_commitment.rental_status_does_not_allow_accessory_assignment';
    case 'RentalPeriodEnded':
      return 'rental_commitment.rental_period_ended';
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
