import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';
import { mapPostgresError } from 'src/core/utils/postgres-error.mapper';

type TransactionClient = Parameters<Parameters<PrismaService['client']['$transaction']>[0]>[0];

import { RentableItem } from '../../domain/rentable-item.aggregate';
import { RentableItemMapper } from './rentable-item.mapper';

@Injectable()
export class PrismaRentableItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async load(tenantId: string, rentableItemId: string): Promise<RentableItem | null> {
    const rentableItem = await this.prisma.client.v2RentableItem.findFirst({
      where: {
        id: rentableItemId,
        tenantId,
        deletedAt: null,
      },
      include: {
        requirements: true,
      },
    });

    if (!rentableItem) {
      return null;
    }

    return RentableItemMapper.toDomain(rentableItem);
  }

  async save(rentableItem: RentableItem, tx?: TransactionClient): Promise<void> {
    const saveAggregate = async (client: TransactionClient): Promise<void> => {
      await client.v2RentableItem.upsert({
        where: { id: rentableItem.id },
        create: RentableItemMapper.toCreateData(rentableItem),
        update: RentableItemMapper.toUpdateData(rentableItem),
      });

      await client.v2RentableItemRequirement.deleteMany({
        where: {
          tenantId: rentableItem.tenantId,
          rentableItemId: rentableItem.id,
        },
      });

      if (rentableItem.requirements.length > 0) {
        await client.v2RentableItemRequirement.createMany({
          data: rentableItem.requirements.map(RentableItemMapper.toRequirementCreateData),
        });
      }
    };

    try {
      if (tx) {
        await saveAggregate(tx);
        return;
      }

      await this.prisma.client.$transaction(saveAggregate);
    } catch (error) {
      mapPostgresError(error);
    }
  }
}
