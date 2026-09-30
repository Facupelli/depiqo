import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AccessoryDefaultsWriter } from '../../application/accessory-defaults-writer';
import { CreateEquipmentTypeAccessoryDefaultsCommand } from './create-equipment-type-accessory-defaults.command';
import { CreateEquipmentTypeAccessoryDefaultsError } from './create-equipment-type-accessory-defaults.errors';

export type CreateEquipmentTypeAccessoryDefaultsServiceResult = Result<void, CreateEquipmentTypeAccessoryDefaultsError>;

@CommandHandler(CreateEquipmentTypeAccessoryDefaultsCommand)
export class CreateEquipmentTypeAccessoryDefaultsHandler implements ICommandHandler<
  CreateEquipmentTypeAccessoryDefaultsCommand,
  CreateEquipmentTypeAccessoryDefaultsServiceResult
> {
  constructor(private readonly writer: AccessoryDefaultsWriter) {}

  execute(
    command: CreateEquipmentTypeAccessoryDefaultsCommand,
  ): Promise<CreateEquipmentTypeAccessoryDefaultsServiceResult> {
    return this.writer.append(command);
  }
}
