import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  CatalogError,
  CatalogInvalidFieldError,
  CatalogRentalOfferAlreadyExistsError,
  CatalogRentableItemArchivedError,
  CatalogRentableItemNotFoundError,
} from '../../domain/errors/catalog.errors';
import { RentalOffer } from '../../domain/rental-offer.entity';
import { CreateRentalOfferForRentableItemCommand } from './create-rental-offer-for-rentable-item.command';
import { PrismaRentalOfferRepository } from '../create-rentable-item-offering/prisma-rental-offer.repository';

export interface CreateRentalOfferForRentableItemResult {
  rentalOfferId: string;
}

@Injectable()
export class CreateRentalOfferForRentableItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rentalOfferRepository: PrismaRentalOfferRepository,
  ) {}

  async execute(
    command: CreateRentalOfferForRentableItemCommand,
  ): Promise<Result<CreateRentalOfferForRentableItemResult, CatalogError>> {
    const tenantId = command.tenantId?.trim();
    const rentableItemId = command.rentableItemId?.trim();
    const branchId = command.branchId?.trim();

    if (!tenantId) {
      return err(new CatalogInvalidFieldError('tenantId', 'tenantId is required'));
    }

    if (!rentableItemId) {
      return err(new CatalogInvalidFieldError('rentableItemId', 'rentableItemId is required'));
    }

    if (!branchId) {
      return err(new CatalogInvalidFieldError('branchId', 'branchId is required'));
    }

    const rentableItem = await this.prisma.client.v2RentableItem.findFirst({
      where: { id: rentableItemId, tenantId, deletedAt: null },
      select: { id: true, status: true },
    });

    if (!rentableItem) {
      return err(new CatalogRentableItemNotFoundError(rentableItemId));
    }

    if (rentableItem.status === 'ARCHIVED') {
      return err(new CatalogRentableItemArchivedError(rentableItemId));
    }

    const existingRentalOffer = await this.prisma.client.v2RentalOffer.findFirst({
      where: { tenantId, branchId, rentableItemId, deletedAt: null },
      select: { id: true },
    });

    if (existingRentalOffer) {
      return err(new CatalogRentalOfferAlreadyExistsError(rentableItemId, branchId));
    }

    const rentalOffer = RentalOffer.create({ tenantId, branchId, rentableItemId });

    if (rentalOffer.isErr()) {
      return err(rentalOffer.error);
    }

    await this.rentalOfferRepository.saveMany([rentalOffer.value]);

    return ok({ rentalOfferId: rentalOffer.value.id });
  }
}
