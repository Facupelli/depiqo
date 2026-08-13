import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { EquipmentTypeReferenceAuthority } from 'src/modules/asset-inventory/public-api/equipment-type-reference-authority.public-api';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { mapPostgresError } from 'src/core/utils/postgres-error.mapper';

import {
  CatalogBranchContextUnavailableError,
  CatalogBranchDeletedError,
  CatalogBranchInactiveError,
  CatalogBranchNotFoundError,
  CatalogEquipmentTypeNotFoundError,
  CatalogError,
  CatalogInvalidFieldError,
} from '../../domain/errors/catalog.errors';
import { RentalOffer } from '../../domain/rental-offer.entity';
import { RentableItem } from '../../domain/rentable-item.aggregate';
import { CreateRentableItemOfferingCommand } from './create-rentable-item-offering.command';
import { PrismaRentableItemRepository } from './prisma-rentable-item.repository';
import { PrismaRentalOfferRepository } from './prisma-rental-offer.repository';

export interface CreateRentableItemOfferingResult {
  rentableItemId: string;
  rentalOfferIds: string[];
}

@Injectable()
export class CreateRentableItemOfferingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly equipmentTypeReferenceAuthority: EquipmentTypeReferenceAuthority,
    private readonly tenantManagement: TenantManagementPublicApi,
    private readonly branchFacts: BranchFacts,
    private readonly rentableItemRepository: PrismaRentableItemRepository,
    private readonly rentalOfferRepository: PrismaRentalOfferRepository,
  ) {}

  async execute(
    command: CreateRentableItemOfferingCommand,
  ): Promise<Result<CreateRentableItemOfferingResult, CatalogError>> {
    const branchIdsValidation = this.validateBranchIds(command.props.branchIds);
    if (branchIdsValidation.isErr()) {
      return err(branchIdsValidation.error);
    }

    const rentableItemResult = RentableItem.createWithRequirements({
      tenantId: command.tenantId,
      name: command.props.name,
      description: command.props.description,
      imageUrl: command.props.imageUrl,
      categoryId: command.props.categoryId,
      kind: command.props.kind,
      requirements: command.props.requirements,
    });

    if (rentableItemResult.isErr()) {
      return err(rentableItemResult.error);
    }

    const rentableItem = rentableItemResult.value;

    const equipmentTypeValidation = await this.equipmentTypeReferenceAuthority.validateEquipmentTypeReferences({
      tenantId: rentableItem.tenantId,
      equipmentTypeIds: rentableItem.requirements.map((requirement) => requirement.equipmentTypeId),
    });
    if (equipmentTypeValidation.isErr()) {
      if (equipmentTypeValidation.error.code === 'EquipmentTypeReferenceNotFound') {
        return err(new CatalogEquipmentTypeNotFoundError());
      }
      throw equipmentTypeValidation.error;
    }

    if (rentableItem.categoryId) {
      const categoryValidation = await this.tenantManagement.validateCategoryAssignment({
        tenantId: rentableItem.tenantId,
        categoryId: rentableItem.categoryId,
      });
      if (categoryValidation.isErr()) {
        return err(
          new CatalogInvalidFieldError(
            'categoryId',
            categoryValidation.error.code === 'CategoryInactive'
              ? 'must reference an active category'
              : 'must reference a category belonging to the tenant',
          ),
        );
      }
    }

    const branchValidation = await this.validateBranches(rentableItem.tenantId, branchIdsValidation.value);
    if (branchValidation.isErr()) {
      return err(branchValidation.error);
    }

    const rentalOffers: RentalOffer[] = [];

    for (const branchId of branchIdsValidation.value) {
      const rentalOfferResult = RentalOffer.create({
        tenantId: command.tenantId,
        branchId,
        rentableItemId: rentableItem.id,
      });

      if (rentalOfferResult.isErr()) {
        return err(rentalOfferResult.error);
      }

      rentalOffers.push(rentalOfferResult.value);
    }

    try {
      await this.prisma.client.$transaction(async (tx) => {
        await this.rentableItemRepository.save(rentableItem, tx);
        await this.rentalOfferRepository.saveMany(rentalOffers, tx);
      });
    } catch (error) {
      mapPostgresError(error);
    }

    return ok({
      rentableItemId: rentableItem.id,
      rentalOfferIds: rentalOffers.map((offer) => offer.id),
    });
  }

  private async validateBranches(tenantId: string, branchIds: string[]): Promise<Result<void, CatalogError>> {
    const branchContexts = await this.branchFacts.getBranchFactsBatch({ tenantId, branchIds });
    if (branchContexts.isErr()) {
      if (branchContexts.error.code === 'BranchNotFound') {
        return err(new CatalogBranchNotFoundError());
      }
      return err(new CatalogBranchContextUnavailableError());
    }

    for (const branchId of branchIds) {
      const branch = branchContexts.value.find((context) => context.branchId === branchId);
      if (!branch) {
        return err(new CatalogBranchNotFoundError(branchId));
      }
      if (branch.isDeleted) {
        return err(new CatalogBranchDeletedError(branchId));
      }
      if (!branch.isActive) {
        return err(new CatalogBranchInactiveError(branchId));
      }
    }

    return ok(undefined);
  }

  private validateBranchIds(branchIds: string[]): Result<string[], CatalogError> {
    if (!branchIds?.length) {
      return err(new CatalogInvalidFieldError('branchIds', 'at least one branchId is required'));
    }

    const normalizedBranchIds: string[] = [];
    const seenBranchIds = new Set<string>();

    for (const branchIdInput of branchIds) {
      const branchId = branchIdInput?.trim();
      if (!branchId) {
        return err(new CatalogInvalidFieldError('branchIds', 'branchIds must not contain blank values'));
      }

      if (seenBranchIds.has(branchId)) {
        return err(new CatalogInvalidFieldError('branchIds', `branchId "${branchId}" was provided more than once`));
      }

      seenBranchIds.add(branchId);
      normalizedBranchIds.push(branchId);
    }

    return ok(normalizedBranchIds);
  }
}
