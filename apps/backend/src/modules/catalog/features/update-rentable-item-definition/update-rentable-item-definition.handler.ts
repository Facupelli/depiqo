import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';
import { EquipmentTypeReferenceAuthority } from 'src/modules/asset-inventory/public-api/equipment-type-reference-authority.public-api';

import { CatalogInvalidFieldError, CatalogRentableItemArchivedError } from '../../domain/errors/catalog.errors';
import { PrismaRentableItemRepository } from '../create-rentable-item-offering/prisma-rentable-item.repository';
import { UpdateRentableItemDefinitionCommand } from './update-rentable-item-definition.command';
import {
  UpdateRentableItemDefinitionError,
  updateRentableItemDefinitionError,
} from './update-rentable-item-definition.errors';

@CommandHandler(UpdateRentableItemDefinitionCommand)
export class UpdateRentableItemDefinitionHandler implements ICommandHandler<
  UpdateRentableItemDefinitionCommand,
  Result<void, UpdateRentableItemDefinitionError>
> {
  constructor(
    private readonly unitOfWork: PrismaUnitOfWork,
    private readonly rentableItemRepository: PrismaRentableItemRepository,
    private readonly equipmentTypeReferenceAuthority: EquipmentTypeReferenceAuthority,
    private readonly tenantManagement: TenantManagementPublicApi,
  ) {}

  async execute(
    command: UpdateRentableItemDefinitionCommand,
  ): Promise<Result<void, UpdateRentableItemDefinitionError>> {
    const context = {
      useCase: 'UpdateRentableItemDefinition',
      tenantId: command.tenantId,
      rentableItemId: command.rentableItemId,
    };
    const rentableItem = await this.rentableItemRepository.load(command.tenantId, command.rentableItemId);

    if (!rentableItem) {
      return err(
        updateRentableItemDefinitionError(
          'catalog.rentable_item_not_found',
          `Rentable item "${command.rentableItemId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    if (command.props.categoryId) {
      const categoryValidation = await this.tenantManagement.validateCategoryAssignment({
        tenantId: command.tenantId,
        categoryId: command.props.categoryId,
      });
      if (categoryValidation.isErr()) {
        return err(
          updateRentableItemDefinitionError(
            categoryValidation.error.code === 'CategoryInactive'
              ? 'catalog.category_inactive'
              : 'catalog.category_not_found',
            categoryValidation.error.message,
            categoryValidation.error,
            { ...context, ...categoryValidation.error.context },
          ),
        );
      }
    }

    const shouldValidateEquipment = command.props.requirements !== undefined || command.props.kind !== undefined;
    if (shouldValidateEquipment) {
      const requirements = command.props.requirements ?? rentableItem.requirements;
      const validation = await this.equipmentTypeReferenceAuthority.validateEquipmentTypeReferences({
        tenantId: command.tenantId,
        equipmentTypeIds: requirements.map((requirement) => requirement.equipmentTypeId),
      });

      if (validation.isErr()) {
        const code = validation.error.code;
        if (code === 'EquipmentTypeReferenceNotFound') {
          return err(
            updateRentableItemDefinitionError(
              'catalog.equipment_type_not_found',
              validation.error.message,
              validation.error,
              { ...context, equipmentTypeId: validation.error.equipmentTypeId },
            ),
          );
        }
        throw validation.error;
      }
    }

    const updateResult = rentableItem.updateDefinition(command.props);
    if (updateResult.isErr()) {
      if (updateResult.error instanceof CatalogRentableItemArchivedError) {
        return err(
          updateRentableItemDefinitionError(
            'catalog.rentable_item_archived',
            updateResult.error.message,
            updateResult.error,
            context,
          ),
        );
      }
      if (updateResult.error instanceof CatalogInvalidFieldError) {
        return err(
          updateRentableItemDefinitionError(
            'catalog.rentable_item_invalid_definition',
            updateResult.error.message,
            updateResult.error,
            { ...context, field: updateResult.error.field },
          ),
        );
      }
      throw updateResult.error;
    }

    await this.unitOfWork.runInTransaction(async ({ tx }) => {
      await this.rentableItemRepository.save(rentableItem, tx);
    });

    return ok(undefined);
  }
}
