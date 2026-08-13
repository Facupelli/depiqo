import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  PhysicalStockSufficiency,
  PhysicalStockSufficiencyError,
  ValidateActiveStockSufficiencyInput,
} from './physical-stock-sufficiency.public-api';

@Injectable()
export class PhysicalStockSufficiencyService extends PhysicalStockSufficiency {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async validateActiveStockSufficiency(
    input: ValidateActiveStockSufficiencyInput,
  ): Promise<Result<void, PhysicalStockSufficiencyError>> {
    const equipmentTypeIds = [...new Set(input.requirements.map((requirement) => requirement.equipmentTypeId))];
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
          code: 'EquipmentTypeNotFound',
          message: `Equipment type "${equipmentTypeId}" was not found for this tenant.`,
          equipmentTypeId,
        });
      }
    }

    const branchIds = [...new Set(input.branchIds)];
    const stockGroups = await this.prisma.client.v2Asset.groupBy({
      by: ['equipmentTypeId', 'branchId'],
      where: {
        tenantId: input.tenantId,
        branchId: { in: branchIds },
        equipmentTypeId: { in: equipmentTypeIds },
        status: 'ACTIVE',
      },
      _count: { _all: true },
    });
    const activeStockByEquipmentTypeAndBranch = new Map(
      stockGroups.map((group) => [`${group.equipmentTypeId}:${group.branchId}`, group._count._all]),
    );

    for (const requirement of input.requirements) {
      for (const branchId of branchIds) {
        const activeAssetCount =
          activeStockByEquipmentTypeAndBranch.get(`${requirement.equipmentTypeId}:${branchId}`) ?? 0;

        if (activeAssetCount < requirement.requiredQuantity) {
          return err({
            code: 'InsufficientActivePhysicalStock',
            message: `Equipment type "${requirement.equipmentTypeId}" requires ${requirement.requiredQuantity} active assets in branch "${branchId}" but only ${activeAssetCount} are available.`,
            equipmentTypeId: requirement.equipmentTypeId,
            branchId,
            requiredQuantity: requirement.requiredQuantity,
            activeAssetCount,
          });
        }
      }
    }

    return ok(undefined);
  }
}
