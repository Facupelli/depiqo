import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  EquipmentTypeReferenceAuthority,
  EquipmentTypeReferenceAuthorityError,
  ValidateEquipmentTypeReferencesInput,
} from './equipment-type-reference-authority.public-api';

@Injectable()
export class EquipmentTypeReferenceAuthorityService extends EquipmentTypeReferenceAuthority {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async validateEquipmentTypeReferences(
    input: ValidateEquipmentTypeReferencesInput,
  ): Promise<Result<void, EquipmentTypeReferenceAuthorityError>> {
    const equipmentTypeIds = [...new Set(input.equipmentTypeIds)];
    if (equipmentTypeIds.length === 0) {
      return ok(undefined);
    }

    const equipmentTypes = await this.prisma.client.v2EquipmentType.findMany({
      where: {
        id: { in: equipmentTypeIds },
        tenantId: input.tenantId,
      },
      select: { id: true },
    });
    const foundEquipmentTypeIds = new Set(equipmentTypes.map((equipmentType) => equipmentType.id));

    for (const equipmentTypeId of equipmentTypeIds) {
      if (!foundEquipmentTypeIds.has(equipmentTypeId)) {
        return err({
          code: 'EquipmentTypeReferenceNotFound',
          message: `Equipment type "${equipmentTypeId}" was not found for this tenant.`,
          equipmentTypeId,
        });
      }
    }

    return ok(undefined);
  }
}
