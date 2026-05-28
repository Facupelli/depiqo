import { Prisma, V2RentableItem, V2RentableItemRequirement } from 'src/generated/prisma/client';

import { RentableItemRequirement } from '../../domain/rentable-item-requirement.entity';
import { RentableItem } from '../../domain/rentable-item.aggregate';

type RentableItemRecord = V2RentableItem & {
  requirements: V2RentableItemRequirement[];
};

export class RentableItemMapper {
  static toDomain(record: RentableItemRecord): RentableItem {
    return RentableItem.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      description: record.description,
      imageUrl: record.imageUrl,
      categoryId: record.categoryId,
      kind: record.kind,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      requirements: record.requirements.map((requirement) =>
        RentableItemRequirement.reconstitute({
          id: requirement.id,
          tenantId: requirement.tenantId,
          rentableItemId: requirement.rentableItemId,
          equipmentTypeId: requirement.equipmentTypeId,
          quantityPerItem: requirement.quantityPerItem,
          createdAt: requirement.createdAt,
          updatedAt: requirement.updatedAt,
        }),
      ),
    });
  }

  static toCreateData(rentableItem: RentableItem): Prisma.V2RentableItemUncheckedCreateInput {
    return {
      id: rentableItem.id,
      tenantId: rentableItem.tenantId,
      name: rentableItem.name,
      description: rentableItem.description ?? null,
      imageUrl: rentableItem.imageUrl ?? null,
      categoryId: rentableItem.categoryId ?? null,
      kind: rentableItem.kind,
      status: rentableItem.status,
    };
  }

  static toUpdateData(rentableItem: RentableItem): Prisma.V2RentableItemUncheckedUpdateInput {
    return {
      name: rentableItem.name,
      description: rentableItem.description ?? null,
      imageUrl: rentableItem.imageUrl ?? null,
      categoryId: rentableItem.categoryId ?? null,
      kind: rentableItem.kind,
      status: rentableItem.status,
    };
  }

  static toRequirementCreateData(
    requirement: RentableItemRequirement,
  ): Prisma.V2RentableItemRequirementCreateManyInput {
    return {
      id: requirement.id,
      tenantId: requirement.tenantId,
      rentableItemId: requirement.rentableItemId,
      equipmentTypeId: requirement.equipmentTypeId,
      quantityPerItem: requirement.quantityPerItem,
    };
  }
}
