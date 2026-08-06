import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';
import { DuplicateEquipmentTypeNameError } from '../../domain/errors/asset-inventory.errors';
import { EquipmentTypeRepository } from '../../persistence/equipment-type.repository';
import { UpdateEquipmentTypeCommand } from './update-equipment-type.command';
import {
  mapUpdateEquipmentTypeError,
  UpdateEquipmentTypeError,
  updateEquipmentTypeError,
} from './update-equipment-type.errors';

export type UpdateEquipmentTypeResult = Result<void, UpdateEquipmentTypeError>;
@CommandHandler(UpdateEquipmentTypeCommand)
export class UpdateEquipmentTypeHandler implements ICommandHandler<
  UpdateEquipmentTypeCommand,
  UpdateEquipmentTypeResult
> {
  constructor(private readonly repository: EquipmentTypeRepository) {}
  async execute(command: UpdateEquipmentTypeCommand): Promise<UpdateEquipmentTypeResult> {
    const equipmentType = await this.repository.loadByIdForTenant({
      tenantId: command.tenantId,
      equipmentTypeId: command.equipmentTypeId,
    });
    if (!equipmentType)
      return err(
        updateEquipmentTypeError('asset_inventory.equipment_type_not_found', 'Equipment type not found.', undefined, {
          equipmentTypeId: command.equipmentTypeId,
        }),
      );
    if (command.name !== undefined) {
      const duplicate = await this.repository.loadByNameForTenant({
        tenantId: command.tenantId,
        name: command.name,
        excludeEquipmentTypeId: equipmentType.id,
      });
      if (duplicate) return err(mapUpdateEquipmentTypeError(new DuplicateEquipmentTypeNameError(command.name.trim())));
    }
    const result = equipmentType.updateMetadata({ name: command.name, description: command.description });
    if (result.isErr()) return err(mapUpdateEquipmentTypeError(result.error));
    if (result.value) await this.repository.save(equipmentType);
    return ok(undefined);
  }
}
