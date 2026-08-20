import { EquipmentType } from '../domain/equipment-type.entity';

type EquipmentTypePersistenceRecord = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class EquipmentTypeMapper {
  static toDomain(record: EquipmentTypePersistenceRecord): EquipmentType {
    return EquipmentType.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      description: record.description,
      imageUrl: record.imageUrl,
      categoryId: record.categoryId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toCreateData(equipmentType: EquipmentType) {
    return {
      id: equipmentType.id,
      tenantId: equipmentType.tenantId,
      ...this.toUpdateData(equipmentType),
    };
  }

  static toUpdateData(equipmentType: EquipmentType) {
    return {
      name: equipmentType.name,
      description: equipmentType.description,
      imageUrl: equipmentType.imageUrl,
      categoryId: equipmentType.categoryId,
    };
  }
}
