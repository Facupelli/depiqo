import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';
import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { toAssetInventoryIntegrationEvents } from '../../application/asset-inventory-integration-event.mapper';
import { EquipmentTypeRepository } from '../../persistence/equipment-type.repository';
import { DeactivateEquipmentTypeCommand } from './deactivate-equipment-type.command';
import { deactivateEquipmentTypeError, DeactivateEquipmentTypeError } from './deactivate-equipment-type.errors';

export type DeactivateEquipmentTypeResult = Result<void, DeactivateEquipmentTypeError>;
@CommandHandler(DeactivateEquipmentTypeCommand)
export class DeactivateEquipmentTypeHandler implements ICommandHandler<
  DeactivateEquipmentTypeCommand,
  DeactivateEquipmentTypeResult
> {
  constructor(
    private readonly repository: EquipmentTypeRepository,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}
  async execute(command: DeactivateEquipmentTypeCommand): Promise<DeactivateEquipmentTypeResult> {
    const type = await this.repository.loadByIdForTenant({
      tenantId: command.tenantId,
      equipmentTypeId: command.equipmentTypeId,
    });
    if (!type)
      return err(
        deactivateEquipmentTypeError('Equipment type not found.', undefined, {
          equipmentTypeId: command.equipmentTypeId,
        }),
      );
    if (!type.deactivate()) return ok(undefined);
    await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
      await this.repository.save(type, tx);
      integrationEvents.collect(toAssetInventoryIntegrationEvents(type.pullDomainEvents()));
    });
    return ok(undefined);
  }
}
