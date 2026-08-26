import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

import { GetEquipmentTypeProductUsagesQuery } from './get-equipment-type-product-usages.query';

export interface EquipmentTypeProductUsageProductReadModel {
  rentableItemId: string;
  name: string;
  quantityPerItem: number;
}

export interface EquipmentTypeProductUsageReadModel {
  equipmentTypeId: string;
  products: EquipmentTypeProductUsageProductReadModel[];
}

export type GetEquipmentTypeProductUsagesResult = EquipmentTypeProductUsageReadModel[];

@QueryHandler(GetEquipmentTypeProductUsagesQuery)
export class GetEquipmentTypeProductUsagesHandler implements IQueryHandler<
  GetEquipmentTypeProductUsagesQuery,
  GetEquipmentTypeProductUsagesResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetEquipmentTypeProductUsagesQuery): Promise<GetEquipmentTypeProductUsagesResult> {
    const equipmentTypeIds = [...new Set(query.equipmentTypeIds)];

    const requirements = await this.prisma.client.v2RentableItemRequirement.findMany({
      where: {
        tenantId: query.tenantId,
        equipmentTypeId: { in: equipmentTypeIds },
      },
      select: {
        equipmentTypeId: true,
        quantityPerItem: true,
        rentableItem: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ rentableItem: { name: 'asc' } }, { rentableItemId: 'asc' }],
    });

    const productsByEquipmentTypeId = new Map<string, EquipmentTypeProductUsageProductReadModel[]>();

    for (const requirement of requirements) {
      const products = productsByEquipmentTypeId.get(requirement.equipmentTypeId) ?? [];
      products.push({
        rentableItemId: requirement.rentableItem.id,
        name: requirement.rentableItem.name,
        quantityPerItem: requirement.quantityPerItem,
      });
      productsByEquipmentTypeId.set(requirement.equipmentTypeId, products);
    }

    return equipmentTypeIds.map((equipmentTypeId) => ({
      equipmentTypeId,
      products: productsByEquipmentTypeId.get(equipmentTypeId) ?? [],
    }));
  }
}
