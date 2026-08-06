import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';
import { mapPostgresError } from 'src/core/utils/postgres-error.mapper';

import { RentalOffer } from '../../domain/rental-offer.entity';
import { RentalOfferMapper } from './rental-offer.mapper';

type TransactionClient = Parameters<Parameters<PrismaService['client']['$transaction']>[0]>[0];

@Injectable()
export class PrismaRentalOfferRepository {
  constructor(private readonly prisma: PrismaService) {}

  async load(tenantId: string, rentalOfferId: string, tx?: TransactionClient): Promise<RentalOffer | null> {
    const client = tx ?? this.prisma.client;
    const record = await client.v2RentalOffer.findFirst({
      where: { id: rentalOfferId, tenantId },
    });

    return record ? RentalOfferMapper.toDomain(record) : null;
  }

  async save(rentalOffer: RentalOffer, tx?: TransactionClient): Promise<void> {
    await this.saveMany([rentalOffer], tx);
  }

  async saveMany(rentalOffers: RentalOffer[], tx?: TransactionClient): Promise<void> {
    if (rentalOffers.length === 0) {
      return;
    }

    const client = tx ?? this.prisma.client;

    try {
      await Promise.all(
        rentalOffers.map((rentalOffer) =>
          client.v2RentalOffer.upsert({
            where: { id: rentalOffer.id },
            create: RentalOfferMapper.toCreateData(rentalOffer),
            update: RentalOfferMapper.toUpdateData(rentalOffer),
          }),
        ),
      );
    } catch (error) {
      mapPostgresError(error);
    }
  }
}
