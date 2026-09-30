import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import { Prisma } from 'src/generated/prisma/client';

import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

import {
  AccessoryDefaultInput,
  AccessoryDefaultSetError,
  validateAccessoryDefaultSet,
  validateNonEmptyAccessoryDefaultAppend,
} from '../domain/accessory-default-set';
import { EquipmentTypeNotFoundError } from '../domain/errors/asset-inventory.errors';

type CommonErrorCode =
  | 'asset_inventory.equipment_type_not_found'
  | 'asset_inventory.accessory_equipment_type_not_found'
  | 'asset_inventory.duplicate_accessory_default_in_request'
  | 'asset_inventory.accessory_default_self_reference_not_allowed'
  | 'asset_inventory.invalid_accessory_default_quantity';

type CommonError = ApplicationError & { code: CommonErrorCode };
type AppendError =
  | CommonError
  | (ApplicationError & {
      code: 'asset_inventory.accessory_default_already_exists' | 'asset_inventory.empty_accessory_default_append';
    });

interface WriteInput {
  tenantId: string;
  equipmentTypeId: string;
  accessories: readonly AccessoryDefaultInput[];
}

@Injectable()
export class AccessoryDefaultsWriter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async append(input: WriteInput): Promise<Result<void, AppendError>> {
    const prepared = await this.prepare(input, 'append');
    if (prepared.isErr()) return err(prepared.error);

    if (validateNonEmptyAccessoryDefaultAppend(input.accessories).isErr()) {
      return err({
        code: 'asset_inventory.empty_accessory_default_append',
        message: 'At least one accessory default is required to append.',
        context: { equipmentTypeId: input.equipmentTypeId },
      });
    }

    const existingDefaults = await this.prisma.client.v2EquipmentTypeAccessoryDefault.findMany({
      where: {
        tenantId: input.tenantId,
        equipmentTypeId: input.equipmentTypeId,
        accessoryEquipmentTypeId: { in: [...prepared.value] },
      },
      select: { accessoryEquipmentTypeId: true },
    });
    const existingDefault = existingDefaults[0];
    if (existingDefault) {
      return err({
        code: 'asset_inventory.accessory_default_already_exists',
        message: `Accessory default already exists for equipment type "${input.equipmentTypeId}" and accessory "${existingDefault.accessoryEquipmentTypeId}".`,
        context: {
          equipmentTypeId: input.equipmentTypeId,
          accessoryEquipmentTypeId: existingDefault.accessoryEquipmentTypeId,
        },
      });
    }

    try {
      await this.prisma.client.v2EquipmentTypeAccessoryDefault.createMany({
        data: input.accessories.map((accessory) => ({
          tenantId: input.tenantId,
          equipmentTypeId: input.equipmentTypeId,
          accessoryEquipmentTypeId: accessory.accessoryEquipmentTypeId,
          quantity: accessory.quantity,
        })),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return err({
          code: 'asset_inventory.accessory_default_already_exists',
          message: `An accessory default already exists for equipment type "${input.equipmentTypeId}".`,
          cause: error,
          context: { equipmentTypeId: input.equipmentTypeId },
        });
      }
      throw error;
    }

    return ok(undefined);
  }

  async replace(input: WriteInput): Promise<Result<void, CommonError>> {
    const prepared = await this.prepare(input, 'replace');
    if (prepared.isErr()) return err(prepared.error);

    await this.unitOfWork.runInTransaction(async ({ tx }) => {
      await tx.v2EquipmentTypeAccessoryDefault.deleteMany({
        where: { tenantId: input.tenantId, equipmentTypeId: input.equipmentTypeId },
      });
      if (input.accessories.length > 0) {
        await tx.v2EquipmentTypeAccessoryDefault.createMany({
          data: input.accessories.map((accessory) => ({
            tenantId: input.tenantId,
            equipmentTypeId: input.equipmentTypeId,
            accessoryEquipmentTypeId: accessory.accessoryEquipmentTypeId,
            quantity: accessory.quantity,
          })),
        });
      }
    });

    return ok(undefined);
  }

  private async prepare(input: WriteInput, operation: 'append' | 'replace'): Promise<Result<Set<string>, CommonError>> {
    const equipmentType = await this.prisma.client.v2EquipmentType.findFirst({
      where: { tenantId: input.tenantId, id: input.equipmentTypeId },
      select: { id: true },
    });
    if (!equipmentType) {
      const cause = new EquipmentTypeNotFoundError(input.equipmentTypeId);
      return err(
        commonError('asset_inventory.equipment_type_not_found', cause.message, cause, {
          equipmentTypeId: input.equipmentTypeId,
        }),
      );
    }

    const validation = validateAccessoryDefaultSet(input.equipmentTypeId, input.accessories);
    if (validation.isErr()) return err(mapSetError(validation.error, operation));

    const accessoryEquipmentTypes = await this.prisma.client.v2EquipmentType.findMany({
      where: { tenantId: input.tenantId, id: { in: [...validation.value] } },
      select: { id: true },
    });
    const foundIds = new Set(accessoryEquipmentTypes.map((accessoryEquipmentType) => accessoryEquipmentType.id));
    for (const accessoryEquipmentTypeId of validation.value) {
      if (!foundIds.has(accessoryEquipmentTypeId)) {
        const cause = new EquipmentTypeNotFoundError(accessoryEquipmentTypeId);
        return err(
          commonError('asset_inventory.accessory_equipment_type_not_found', cause.message, cause, {
            accessoryEquipmentTypeId,
          }),
        );
      }
    }

    return ok(validation.value);
  }
}

function commonError(
  code: CommonErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): CommonError {
  return { code, message, cause, context };
}

function mapSetError(error: AccessoryDefaultSetError, operation: 'append' | 'replace'): CommonError {
  switch (error.kind) {
    case 'self_reference':
      return commonError(
        'asset_inventory.accessory_default_self_reference_not_allowed',
        `Equipment type "${error.equipmentTypeId}" cannot be its own accessory default.`,
        error,
        { equipmentTypeId: error.equipmentTypeId },
      );
    case 'duplicate':
      return commonError(
        'asset_inventory.duplicate_accessory_default_in_request',
        operation === 'append'
          ? `Accessory equipment type "${error.accessoryEquipmentTypeId}" appears more than once in the request.`
          : `Accessory equipment type "${error.accessoryEquipmentTypeId}" appears more than once in the replacement set.`,
        error,
        { accessoryEquipmentTypeId: error.accessoryEquipmentTypeId },
      );
    case 'invalid_quantity':
      return commonError(
        'asset_inventory.invalid_accessory_default_quantity',
        `Accessory equipment type "${error.accessoryEquipmentTypeId}" must have a positive integer quantity.`,
        error,
        { accessoryEquipmentTypeId: error.accessoryEquipmentTypeId },
      );
  }
}
