import { EquipmentType } from '../domain/equipment-type.entity';

type EquipmentTypePersistenceRecord = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  isActive: boolean;
  deletedAt: Date | null;
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
      categoryId: record.categoryId,
      isActive: record.isActive,
      deletedAt: record.deletedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toCreateData(equipmentType: EquipmentType) {
    return {
      id: equipmentType.id,
      tenantId: equipmentType.tenantId,
      name: equipmentType.name,
      description: equipmentType.description,
      categoryId: equipmentType.categoryId,
      isActive: equipmentType.isActive,
      deletedAt: equipmentType.deletedAt,
    };
  }

  static toUpdateData(equipmentType: EquipmentType) {
    return {
      name: equipmentType.name,
      description: equipmentType.description,
      categoryId: equipmentType.categoryId,
      isActive: equipmentType.isActive,
      deletedAt: equipmentType.deletedAt,
    };
  }
}
