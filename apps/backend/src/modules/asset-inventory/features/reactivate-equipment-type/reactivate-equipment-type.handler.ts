import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';
import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { toAssetInventoryIntegrationEvents } from '../../application/asset-inventory-integration-event.mapper';
import { EquipmentTypeRepository } from '../../persistence/equipment-type.repository';
import { ReactivateEquipmentTypeCommand } from './reactivate-equipment-type.command';
import { reactivateEquipmentTypeError, ReactivateEquipmentTypeError } from './reactivate-equipment-type.errors';

export type ReactivateEquipmentTypeResult = Result<void, ReactivateEquipmentTypeError>;
@CommandHandler(ReactivateEquipmentTypeCommand)
export class ReactivateEquipmentTypeHandler implements ICommandHandler<
  ReactivateEquipmentTypeCommand,
  ReactivateEquipmentTypeResult
> {
  constructor(
    private readonly repository: EquipmentTypeRepository,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}
  async execute(command: ReactivateEquipmentTypeCommand): Promise<ReactivateEquipmentTypeResult> {
    const type = await this.repository.loadByIdForTenant({
      tenantId: command.tenantId,
      equipmentTypeId: command.equipmentTypeId,
    });
    if (!type)
      return err(
        reactivateEquipmentTypeError('Equipment type not found.', undefined, {
          equipmentTypeId: command.equipmentTypeId,
        }),
      );
    if (!type.reactivate()) return ok(undefined);
    await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
      await this.repository.save(type, tx);
      integrationEvents.collect(toAssetInventoryIntegrationEvents(type.pullDomainEvents()));
    });
    return ok(undefined);
  }
}
