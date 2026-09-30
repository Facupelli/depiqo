import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AccessoryDefaultsWriter } from '../../application/accessory-defaults-writer';
import { ReplaceEquipmentTypeAccessoryDefaultsCommand } from './replace-equipment-type-accessory-defaults.command';
import { ReplaceEquipmentTypeAccessoryDefaultsError } from './replace-equipment-type-accessory-defaults.errors';

export type ReplaceEquipmentTypeAccessoryDefaultsResult = Result<void, ReplaceEquipmentTypeAccessoryDefaultsError>;

@CommandHandler(ReplaceEquipmentTypeAccessoryDefaultsCommand)
export class ReplaceEquipmentTypeAccessoryDefaultsHandler implements ICommandHandler<
  ReplaceEquipmentTypeAccessoryDefaultsCommand,
  ReplaceEquipmentTypeAccessoryDefaultsResult
> {
  constructor(private readonly writer: AccessoryDefaultsWriter) {}

  execute(command: ReplaceEquipmentTypeAccessoryDefaultsCommand): Promise<ReplaceEquipmentTypeAccessoryDefaultsResult> {
    return this.writer.replace(command);
  }
}
