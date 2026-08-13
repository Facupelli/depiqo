import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { EquipmentTypeNotFoundError } from '../../domain/errors/asset-inventory.errors';
import { EquipmentTypeRepository } from '../../persistence/equipment-type.repository';
import { ReplaceEquipmentTypeAccessoryDefaultsCommand } from './replace-equipment-type-accessory-defaults.command';
import {
  DuplicateAccessoryInReplacementError,
  mapReplaceEquipmentTypeAccessoryDefaultsError,
  ReplaceEquipmentTypeAccessoryDefaultsError,
  SelfReferenceAccessoryReplacementError,
} from './replace-equipment-type-accessory-defaults.errors';

export type ReplaceEquipmentTypeAccessoryDefaultsResult = Result<void, ReplaceEquipmentTypeAccessoryDefaultsError>;

@CommandHandler(ReplaceEquipmentTypeAccessoryDefaultsCommand)
export class ReplaceEquipmentTypeAccessoryDefaultsHandler implements ICommandHandler<
  ReplaceEquipmentTypeAccessoryDefaultsCommand,
  ReplaceEquipmentTypeAccessoryDefaultsResult
> {
  constructor(
    private readonly equipmentTypeRepository: EquipmentTypeRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    command: ReplaceEquipmentTypeAccessoryDefaultsCommand,
  ): Promise<ReplaceEquipmentTypeAccessoryDefaultsResult> {
    const equipmentType = await this.equipmentTypeRepository.loadByIdForTenant({
      tenantId: command.tenantId,
      equipmentTypeId: command.equipmentTypeId,
    });

    if (!equipmentType) {
      return err(
        mapReplaceEquipmentTypeAccessoryDefaultsError(new EquipmentTypeNotFoundError(command.equipmentTypeId)),
      );
    }

    const uniqueAccessoryEquipmentTypeIds = new Set<string>();
    for (const accessory of command.accessories) {
      if (accessory.accessoryEquipmentTypeId === command.equipmentTypeId) {
        return err(
          mapReplaceEquipmentTypeAccessoryDefaultsError(
            new SelfReferenceAccessoryReplacementError(command.equipmentTypeId),
          ),
        );
      }

      if (uniqueAccessoryEquipmentTypeIds.has(accessory.accessoryEquipmentTypeId)) {
        return err(
          mapReplaceEquipmentTypeAccessoryDefaultsError(
            new DuplicateAccessoryInReplacementError(accessory.accessoryEquipmentTypeId),
          ),
        );
      }

      uniqueAccessoryEquipmentTypeIds.add(accessory.accessoryEquipmentTypeId);
    }

    const accessoryEquipmentTypes = await this.prisma.client.v2EquipmentType.findMany({
      where: {
        tenantId: command.tenantId,
        id: { in: [...uniqueAccessoryEquipmentTypeIds] },
      },
      select: { id: true },
    });
    const accessoryEquipmentTypesById = new Map(
      accessoryEquipmentTypes.map((accessoryEquipmentType) => [accessoryEquipmentType.id, accessoryEquipmentType]),
    );

    for (const accessoryEquipmentTypeId of uniqueAccessoryEquipmentTypeIds) {
      const accessoryEquipmentType = accessoryEquipmentTypesById.get(accessoryEquipmentTypeId);
      if (!accessoryEquipmentType) {
        return err(
          mapReplaceEquipmentTypeAccessoryDefaultsError(
            new EquipmentTypeNotFoundError(accessoryEquipmentTypeId),
            'accessoryEquipmentType',
          ),
        );
      }
    }

    await this.prisma.client.$transaction(async (tx) => {
      await tx.v2EquipmentTypeAccessoryDefault.deleteMany({
        where: {
          tenantId: command.tenantId,
          equipmentTypeId: command.equipmentTypeId,
        },
      });

      if (command.accessories.length > 0) {
        await tx.v2EquipmentTypeAccessoryDefault.createMany({
          data: command.accessories.map((accessory) => ({
            tenantId: command.tenantId,
            equipmentTypeId: command.equipmentTypeId,
            accessoryEquipmentTypeId: accessory.accessoryEquipmentTypeId,
            quantity: accessory.quantity,
          })),
        });
      }
    });

    return ok(undefined);
  }
}
