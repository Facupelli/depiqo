import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { CatalogRentableItemCannotBeActivatedFromStatusError } from '../../domain/errors/catalog.errors';
import { PrismaRentableItemRepository } from '../create-rentable-item-offering/prisma-rentable-item.repository';
import {
  ActivateRentableItemApplicationError,
  activateRentableItemApplicationError,
  InsufficientActiveAssetsContext,
} from './activate-rentable-item-application.error';
import { ActivateRentableItemCommand } from './activate-rentable-item.command';

@CommandHandler(ActivateRentableItemCommand)
export class ActivateRentableItemHandler implements ICommandHandler<
  ActivateRentableItemCommand,
  Result<void, ActivateRentableItemApplicationError>
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rentableItemRepository: PrismaRentableItemRepository,
  ) {}

  async execute(command: ActivateRentableItemCommand): Promise<Result<void, ActivateRentableItemApplicationError>> {
    const rentableItem = await this.rentableItemRepository.load(command.tenantId, command.rentableItemId);

    if (!rentableItem) {
      return err(
        activateRentableItemApplicationError('RentableItemNotFound', 'The requested rentable item could not be found.'),
      );
    }

    const activationResult = rentableItem.activate();
    if (activationResult.isErr()) {
      if (activationResult.error instanceof CatalogRentableItemCannotBeActivatedFromStatusError) {
        return err(
          activateRentableItemApplicationError(
            'RentableItemNotInDraftStatus',
            activationResult.error.message,
            activationResult.error,
          ),
        );
      }

      return err(
        activateRentableItemApplicationError('Unexpected', 'An unexpected error occurred.', activationResult.error),
      );
    }

    // TODO: Refactor these direct Prisma validations behind cross-bounded-context public APIs/facades
    // once Catalog, Pricing, Asset Inventory, and Tenant Management module contracts are stable.
    const eligibilityResult = await this.validateActivationEligibility(command.tenantId, command.rentableItemId);
    if (eligibilityResult.isErr()) {
      return err(eligibilityResult.error);
    }

    await this.rentableItemRepository.save(rentableItem);

    return ok(undefined);
  }

  private async validateActivationEligibility(
    tenantId: string,
    rentableItemId: string,
  ): Promise<Result<void, ActivateRentableItemApplicationError>> {
    const item = await this.prisma.client.v2RentableItem.findFirst({
      where: { id: rentableItemId, tenantId, deletedAt: null },
      select: {
        requirements: {
          select: { equipmentTypeId: true, quantityPerItem: true },
        },
        rentalOffers: {
          where: { deletedAt: null },
          select: { id: true, branchId: true },
        },
      },
    });

    if (!item) {
      return err(activateRentableItemApplicationError('RentableItemNotFound', 'The rentable item was not found.'));
    }

    if (item.requirements.length === 0) {
      return err(
        activateRentableItemApplicationError(
          'RentableItemHasNoRequirements',
          'The rentable item must have at least one equipment requirement before it can be activated.',
        ),
      );
    }

    if (item.rentalOffers.length === 0) {
      return err(
        activateRentableItemApplicationError(
          'RentableItemHasNoRentalOffers',
          'The rentable item must have at least one rental offer before it can be activated.',
        ),
      );
    }

    const offerIds = item.rentalOffers.map((offer) => offer.id);
    const activePricings = await this.prisma.client.v2RentalOfferPricing.findMany({
      where: {
        tenantId,
        catalogRentalOfferId: { in: offerIds },
        isActive: true,
        deletedAt: null,
        ratePlan: {
          isActive: true,
          deletedAt: null,
          tiers: { some: {} },
        },
      },
      select: { catalogRentalOfferId: true },
    });

    const activePricingOfferIds = new Set(activePricings.map((pricing) => pricing.catalogRentalOfferId));
    const pricedOffers = item.rentalOffers.filter((offer) => activePricingOfferIds.has(offer.id));

    if (pricedOffers.length === 0) {
      return err(
        activateRentableItemApplicationError(
          'RentableItemHasNoActivePricing',
          'At least one rental offer must have active pricing before the rentable item can be activated.',
        ),
      );
    }

    for (const offer of pricedOffers) {
      const insufficientContext = await this.findInsufficientRequirementForBranch(
        tenantId,
        offer.branchId,
        item.requirements,
      );

      if (insufficientContext) {
        return err(
          activateRentableItemApplicationError(
            'RentableItemHasInsufficientActiveAssets',
            'Every priced branch offer must have enough active assets to fulfill the rentable item requirements.',
            undefined,
            insufficientContext,
          ),
        );
      }
    }

    return ok(undefined);
  }

  private async findInsufficientRequirementForBranch(
    tenantId: string,
    branchId: string,
    requirements: Array<{ equipmentTypeId: string; quantityPerItem: number }>,
  ): Promise<InsufficientActiveAssetsContext | undefined> {
    for (const requirement of requirements) {
      const activeAssetCount = await this.prisma.client.v2Asset.count({
        where: {
          tenantId,
          branchId,
          equipmentTypeId: requirement.equipmentTypeId,
          status: 'ACTIVE',
          deletedAt: null,
        },
      });

      if (activeAssetCount < requirement.quantityPerItem) {
        return {
          branchId,
          equipmentTypeId: requirement.equipmentTypeId,
          requiredQuantity: requirement.quantityPerItem,
          activeAssetCount,
        };
      }
    }

    return undefined;
  }
}
