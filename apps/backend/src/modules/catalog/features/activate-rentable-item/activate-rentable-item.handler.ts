import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { CatalogRentableItemCannotBeActivatedFromStatusError } from '../../domain/errors/catalog.errors';
import { PrismaRentableItemRepository } from '../create-rentable-item-offering/prisma-rentable-item.repository';
import { ActivateRentableItemCommand } from './activate-rentable-item.command';
import { ActivateRentableItemError, activateRentableItemError } from './activate-rentable-item.errors';

@CommandHandler(ActivateRentableItemCommand)
export class ActivateRentableItemHandler implements ICommandHandler<
  ActivateRentableItemCommand,
  Result<void, ActivateRentableItemError>
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rentableItemRepository: PrismaRentableItemRepository,
  ) {}

  async execute(command: ActivateRentableItemCommand): Promise<Result<void, ActivateRentableItemError>> {
    const context = this.errorContext(command);
    const rentableItem = await this.rentableItemRepository.load(command.tenantId, command.rentableItemId);

    if (!rentableItem) {
      return err(
        activateRentableItemError(
          'catalog.rentable_item_not_found',
          `Rentable item "${command.rentableItemId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    const activationResult = rentableItem.activate();
    if (activationResult.isErr()) {
      if (activationResult.error instanceof CatalogRentableItemCannotBeActivatedFromStatusError) {
        return err(
          activateRentableItemError(
            'catalog.rentable_item_not_in_draft_status',
            activationResult.error.message,
            activationResult.error,
            context,
          ),
        );
      }

      throw activationResult.error;
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

  private errorContext(command: ActivateRentableItemCommand): Record<string, unknown> {
    return {
      useCase: 'ActivateRentableItem',
      tenantId: command.tenantId,
      rentableItemId: command.rentableItemId,
    };
  }

  private async validateActivationEligibility(
    tenantId: string,
    rentableItemId: string,
  ): Promise<Result<void, ActivateRentableItemError>> {
    const context = { useCase: 'ActivateRentableItem', tenantId, rentableItemId };
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
      return err(
        activateRentableItemError(
          'catalog.rentable_item_not_found',
          `Rentable item "${rentableItemId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    if (item.requirements.length === 0) {
      return err(
        activateRentableItemError(
          'catalog.rentable_item_has_no_requirements',
          'The rentable item must have at least one equipment requirement before it can be activated.',
          undefined,
          context,
        ),
      );
    }

    if (item.rentalOffers.length === 0) {
      return err(
        activateRentableItemError(
          'catalog.rentable_item_has_no_rental_offers',
          'The rentable item must have at least one rental offer before it can be activated.',
          undefined,
          context,
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
        activateRentableItemError(
          'catalog.rentable_item_has_no_active_pricing',
          'At least one rental offer must have active pricing before the rentable item can be activated.',
          undefined,
          context,
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
          activateRentableItemError(
            'catalog.rentable_item_has_insufficient_active_assets',
            'Every priced branch offer must have enough active assets to fulfill the rentable item requirements.',
            undefined,
            { ...context, ...insufficientContext },
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
  ): Promise<
    { branchId: string; equipmentTypeId: string; requiredQuantity: number; activeAssetCount: number } | undefined
  > {
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
