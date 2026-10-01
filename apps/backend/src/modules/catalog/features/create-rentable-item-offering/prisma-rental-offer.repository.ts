import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';
import { mapPostgresError } from 'src/core/utils/postgres-error.mapper';

import { RentalOffer, UpdateRentalOfferSettingsProps } from '../../domain/rental-offer.entity';
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

  /** Called after locking the parent item and loading the offer in the same transaction. */
  async updateSettings(
    rentalOffer: RentalOffer,
    supplied: UpdateRentalOfferSettingsProps,
    firstPublishedAt: Date | null,
    tx: TransactionClient,
  ): Promise<void> {
    const data = RentalOfferMapper.toSettingsUpdateData(rentalOffer, supplied, firstPublishedAt);
    if (Object.keys(data).length === 0) return;

    const updated = await tx.v2RentalOffer.updateMany({
      where: {
        id: rentalOffer.id,
        tenantId: rentalOffer.tenantId,
        ...(firstPublishedAt !== null && { firstPublishedAt: null }),
      },
      data,
    });
    if (updated.count !== 1) {
      throw new Error(`Rental offer "${rentalOffer.id}" changed during its settings update.`);
    }
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
