import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';

import {
  EquipmentTypeReferenceAuthority,
  EquipmentTypeReferenceAuthorityError,
  ValidateEquipmentTypeReferencesInput,
} from './equipment-type-reference-authority.public-api';

@Injectable()
export class EquipmentTypeReferenceAuthorityService extends EquipmentTypeReferenceAuthority {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {
    super();
  }

  async validateEquipmentTypeReferences(
    input: ValidateEquipmentTypeReferencesInput,
  ): Promise<Result<void, EquipmentTypeReferenceAuthorityError>> {
    const equipmentTypeIds = [...new Set(input.equipmentTypeIds)];
    if (equipmentTypeIds.length === 0) {
      return ok(undefined);
    }

    // Reading through runInTransaction keeps this validation consistent with
    // uncommitted writes when called inside a caller's ambient transaction
    // (e.g. Offering Setup coordination); standalone it opens a short read
    // transaction.
    const equipmentTypes = await this.unitOfWork.runInTransaction(({ tx }) =>
      tx.v2EquipmentType.findMany({
        where: {
          id: { in: equipmentTypeIds },
          tenantId: input.tenantId,
        },
        select: { id: true },
      }),
    );
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
