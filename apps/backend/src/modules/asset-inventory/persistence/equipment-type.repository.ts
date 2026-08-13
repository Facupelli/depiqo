import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import { EquipmentType } from '../domain/equipment-type.entity';
import { EquipmentTypeMapper } from './equipment-type.mapper';

type TransactionClient = Parameters<Parameters<PrismaService['client']['$transaction']>[0]>[0];

@Injectable()
export class EquipmentTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadByIdForTenant(input: { tenantId: string; equipmentTypeId: string }): Promise<EquipmentType | null> {
    const record = await this.prisma.client.v2EquipmentType.findFirst({
      where: {
        id: input.equipmentTypeId,
        tenantId: input.tenantId,
      },
    });

    return record ? EquipmentTypeMapper.toDomain(record) : null;
  }

  async loadActiveByNameForTenant(input: { tenantId: string; name: string }): Promise<EquipmentType | null> {
    return this.loadByNameForTenant(input);
  }

  async loadByNameForTenant(input: {
    tenantId: string;
    name: string;
    excludeEquipmentTypeId?: string;
  }): Promise<EquipmentType | null> {
    const normalizedName = EquipmentType.normalizeNameForComparison(input.name);

    const records = await this.prisma.client.v2EquipmentType.findMany({
      where: {
        tenantId: input.tenantId,
        id: input.excludeEquipmentTypeId ? { not: input.excludeEquipmentTypeId } : undefined,
      },
    });

    const matchingRecord = records.find(
      (record) => EquipmentType.normalizeNameForComparison(record.name) === normalizedName,
    );

    return matchingRecord ? EquipmentTypeMapper.toDomain(matchingRecord) : null;
  }

  async save(equipmentType: EquipmentType, tx?: TransactionClient): Promise<void> {
    const client = tx ?? this.prisma.client;

    await client.v2EquipmentType.upsert({
      where: { id: equipmentType.id },
      create: EquipmentTypeMapper.toCreateData(equipmentType),
      update: EquipmentTypeMapper.toUpdateData(equipmentType),
    });
  }
}
