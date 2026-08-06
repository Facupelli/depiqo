import { Asset } from '../domain/asset.entity';

type AssetPersistenceRecord = {
  id: string;
  tenantId: string;
  branchId: string;
  equipmentTypeId: string;
  ownerId: string | null;
  serialNumber: string | null;
  notes: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'RETIRED';
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export class AssetMapper {
  static toDomain(record: AssetPersistenceRecord): Asset {
    return Asset.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      branchId: record.branchId,
      equipmentTypeId: record.equipmentTypeId,
      ownerId: record.ownerId,
      serialNumber: record.serialNumber,
      notes: record.notes,
      status: record.status,
      deletedAt: record.deletedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toCreateData(asset: Asset) {
    return {
      id: asset.id,
      tenantId: asset.tenantId,
      ...this.toUpdateData(asset),
    };
  }

  static toUpdateData(asset: Asset) {
    return {
      branchId: asset.branchId,
      equipmentTypeId: asset.equipmentTypeId,
      ownerId: asset.ownerId,
      serialNumber: asset.serialNumber,
      notes: asset.notes,
      status: asset.status,
      deletedAt: asset.deletedAt,
    };
  }
}
