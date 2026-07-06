import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';
import { Prisma } from 'src/generated/prisma/client';

import { PrismaService } from 'src/core/database/prisma.service';

import { EquipmentTypeNotActiveError, EquipmentTypeNotFoundError } from '../../domain/errors/asset-inventory.errors';
import { EquipmentTypeRepository } from '../../persistence/equipment-type.repository';
import { CreateEquipmentTypeAccessoryDefaultsApplicationError } from './create-equipment-type-accessory-defaults-application.error';
import { CreateEquipmentTypeAccessoryDefaultsCommand } from './create-equipment-type-accessory-defaults.command';
import {
  AccessoryDefaultAlreadyExistsError,
  DuplicateAccessoryInRequestError,
  mapCreateEquipmentTypeAccessoryDefaultsError,
  SelfReferenceAccessoryDefaultError,
} from './map-create-equipment-type-accessory-defaults-error';

export type CreateEquipmentTypeAccessoryDefaultsServiceResult = Result<
  void,
  CreateEquipmentTypeAccessoryDefaultsApplicationError
>;

@CommandHandler(CreateEquipmentTypeAccessoryDefaultsCommand)
export class CreateEquipmentTypeAccessoryDefaultsHandler implements ICommandHandler<
  CreateEquipmentTypeAccessoryDefaultsCommand,
  CreateEquipmentTypeAccessoryDefaultsServiceResult
> {
  constructor(
    private readonly equipmentTypeRepository: EquipmentTypeRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    command: CreateEquipmentTypeAccessoryDefaultsCommand,
  ): Promise<CreateEquipmentTypeAccessoryDefaultsServiceResult> {
    const equipmentType = await this.equipmentTypeRepository.loadByIdForTenant({
      tenantId: command.tenantId,
      equipmentTypeId: command.equipmentTypeId,
    });

    if (!equipmentType) {
      return err(mapCreateEquipmentTypeAccessoryDefaultsError(new EquipmentTypeNotFoundError(command.equipmentTypeId)));
    }
    if (!equipmentType.isActive) {
      return err(
        mapCreateEquipmentTypeAccessoryDefaultsError(new EquipmentTypeNotActiveError(command.equipmentTypeId)),
      );
    }

    const accessoryEquipmentTypeIds = command.accessories.map((accessory) => accessory.accessoryEquipmentTypeId);
    const uniqueAccessoryEquipmentTypeIds = new Set<string>();
    for (const accessoryEquipmentTypeId of accessoryEquipmentTypeIds) {
      if (accessoryEquipmentTypeId === command.equipmentTypeId) {
        return err(
          mapCreateEquipmentTypeAccessoryDefaultsError(new SelfReferenceAccessoryDefaultError(command.equipmentTypeId)),
        );
      }

      if (uniqueAccessoryEquipmentTypeIds.has(accessoryEquipmentTypeId)) {
        return err(
          mapCreateEquipmentTypeAccessoryDefaultsError(new DuplicateAccessoryInRequestError(accessoryEquipmentTypeId)),
        );
      }

      uniqueAccessoryEquipmentTypeIds.add(accessoryEquipmentTypeId);
    }

    const accessoryEquipmentTypes = await this.prisma.client.v2EquipmentType.findMany({
      where: {
        tenantId: command.tenantId,
        id: { in: [...uniqueAccessoryEquipmentTypeIds] },
        deletedAt: null,
      },
      select: { id: true, isActive: true },
    });
    const accessoryEquipmentTypesById = new Map(
      accessoryEquipmentTypes.map((accessoryEquipmentType) => [accessoryEquipmentType.id, accessoryEquipmentType]),
    );

    for (const accessoryEquipmentTypeId of uniqueAccessoryEquipmentTypeIds) {
      const accessoryEquipmentType = accessoryEquipmentTypesById.get(accessoryEquipmentTypeId);
      if (!accessoryEquipmentType) {
        return err(
          mapCreateEquipmentTypeAccessoryDefaultsError(
            new EquipmentTypeNotFoundError(accessoryEquipmentTypeId),
            'accessoryEquipmentType',
          ),
        );
      }
      if (!accessoryEquipmentType.isActive) {
        return err(
          mapCreateEquipmentTypeAccessoryDefaultsError(
            new EquipmentTypeNotActiveError(accessoryEquipmentTypeId),
            'accessoryEquipmentType',
          ),
        );
      }
    }

    const existingDefaults = await this.prisma.client.v2EquipmentTypeAccessoryDefault.findMany({
      where: {
        tenantId: command.tenantId,
        equipmentTypeId: command.equipmentTypeId,
        accessoryEquipmentTypeId: { in: [...uniqueAccessoryEquipmentTypeIds] },
      },
      select: { accessoryEquipmentTypeId: true },
    });
    const existingDefault = existingDefaults[0];

    if (existingDefault) {
      return err(
        mapCreateEquipmentTypeAccessoryDefaultsError(
          new AccessoryDefaultAlreadyExistsError(command.equipmentTypeId, existingDefault.accessoryEquipmentTypeId),
        ),
      );
    }

    try {
      await this.prisma.client.v2EquipmentTypeAccessoryDefault.createMany({
        data: command.accessories.map((accessory) => ({
          tenantId: command.tenantId,
          equipmentTypeId: command.equipmentTypeId,
          accessoryEquipmentTypeId: accessory.accessoryEquipmentTypeId,
          quantity: accessory.quantity,
        })),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return err(
          mapCreateEquipmentTypeAccessoryDefaultsError(
            new AccessoryDefaultAlreadyExistsError(
              command.equipmentTypeId,
              command.accessories[0].accessoryEquipmentTypeId,
            ),
          ),
        );
      }

      throw error;
    }

    return ok(undefined);
  }
}
