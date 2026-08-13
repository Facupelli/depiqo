import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';
import {
  CatalogBranchContextUnavailableError,
  CatalogBranchDeletedError,
  CatalogBranchInactiveError,
  CatalogBranchNotFoundError,
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
    private readonly tenantManagement: TenantManagementPublicApi,
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
      where: { id: rentableItemId, tenantId },
      select: { id: true, status: true },
    });

    if (!rentableItem) {
      return err(new CatalogRentableItemNotFoundError(rentableItemId));
    }

    if (rentableItem.status === 'ARCHIVED') {
      return err(new CatalogRentableItemArchivedError(rentableItemId));
    }

    const existingRentalOffer = await this.prisma.client.v2RentalOffer.findFirst({
      where: { tenantId, branchId, rentableItemId },
      select: { id: true },
    });

    if (existingRentalOffer) {
      return err(new CatalogRentalOfferAlreadyExistsError(rentableItemId, branchId));
    }

    const branchValidation = await this.validateBranch(tenantId, branchId);
    if (branchValidation.isErr()) {
      return err(branchValidation.error);
    }

    const rentalOffer = RentalOffer.create({ tenantId, branchId, rentableItemId });

    if (rentalOffer.isErr()) {
      return err(rentalOffer.error);
    }

    await this.rentalOfferRepository.saveMany([rentalOffer.value]);

    return ok({ rentalOfferId: rentalOffer.value.id });
  }

  private async validateBranch(tenantId: string, branchId: string): Promise<Result<void, CatalogError>> {
    const branchContext = await this.tenantManagement.getBranchContext({ tenantId, branchId });
    if (branchContext.isErr()) {
      if (branchContext.error.code === 'BranchNotFound') {
        return err(new CatalogBranchNotFoundError(branchId));
      }
      return err(new CatalogBranchContextUnavailableError());
    }
    if (branchContext.value.isDeleted) {
      return err(new CatalogBranchDeletedError(branchId));
    }
    if (!branchContext.value.isActive) {
      return err(new CatalogBranchInactiveError(branchId));
    }

    return ok(undefined);
  }
}
