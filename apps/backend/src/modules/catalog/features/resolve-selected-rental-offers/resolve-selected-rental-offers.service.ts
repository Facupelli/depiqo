import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import {
  CatalogSelectionResolutionError,
  ResolveSelectedRentalOffersInput,
  ResolveSelectedRentalOffersResult,
  SelectedRentalOfferInput,
} from '../../public-api/catalog-selection-resolution.public-api';
import {
  FulfillmentRequirementReadModel,
  PrismaResolveSelectedRentalOffersReader,
} from './prisma-resolve-selected-rental-offers.reader';

@Injectable()
export class ResolveSelectedRentalOffersService {
  constructor(private readonly reader: PrismaResolveSelectedRentalOffersReader) {}

  async execute(
    input: ResolveSelectedRentalOffersInput,
  ): Promise<Result<ResolveSelectedRentalOffersResult, CatalogSelectionResolutionError>> {
    const payloadValidation = this.validateSelectionPayload(input.selectedOffers);

    if (payloadValidation.isErr()) {
      return err(payloadValidation.error);
    }

    const rentalOfferIds = input.selectedOffers.map((selection) => selection.rentalOfferId);
    const rentalOffers = await this.reader.findRentalOffers({
      tenantId: input.tenantId,
      branchId: input.branchId,
      rentalOfferIds,
    });
    const rentalOffersById = this.indexById(rentalOffers);

    for (const selection of input.selectedOffers) {
      const rentalOffer = rentalOffersById.get(selection.rentalOfferId);

      if (!rentalOffer) {
        return err(
          catalogSelectionError('RentalOfferNotFound', `Rental offer "${selection.rentalOfferId}" was not found.`, {
            rentalOfferId: selection.rentalOfferId,
          }),
        );
      }

      if (!rentalOffer.isRentable) {
        return err(
          catalogSelectionError(
            'RentalOfferNotRentable',
            `Rental offer "${selection.rentalOfferId}" is not rentable.`,
            { rentalOfferId: selection.rentalOfferId },
          ),
        );
      }
    }

    const rentableItemIds = [...new Set(rentalOffers.map((offer) => offer.rentableItemId))];
    const rentableItems = await this.reader.findRentableItems({
      tenantId: input.tenantId,
      rentableItemIds,
    });
    const rentableItemsById = this.indexById(rentableItems);

    for (const offer of rentalOffers) {
      const rentableItem = rentableItemsById.get(offer.rentableItemId);

      if (!rentableItem) {
        return err(
          catalogSelectionError('RentableItemNotActive', `Rentable item "${offer.rentableItemId}" is not active.`, {
            rentalOfferId: offer.id,
          }),
        );
      }

      if (rentableItem.status !== 'ACTIVE') {
        return err(
          catalogSelectionError('RentableItemNotActive', `Rentable item "${offer.rentableItemId}" is not active.`, {
            rentalOfferId: offer.id,
          }),
        );
      }
    }

    const requirements = await this.reader.findFulfillmentRequirements({
      tenantId: input.tenantId,
      rentableItemIds,
    });
    const requirementsByRentableItemId = this.groupRequirementsByRentableItemId(requirements);

    for (const rentableItemId of rentableItemIds) {
      const itemRequirements = requirementsByRentableItemId.get(rentableItemId) ?? [];

      if (itemRequirements.length === 0) {
        return err(
          catalogSelectionError(
            'InvalidFulfillmentDefinition',
            `Rentable item "${rentableItemId}" has no fulfillment requirements.`,
          ),
        );
      }

      for (const requirement of itemRequirements) {
        if (!Number.isInteger(requirement.quantityPerItem) || requirement.quantityPerItem <= 0) {
          return err(
            catalogSelectionError(
              'InvalidFulfillmentDefinition',
              `Fulfillment requirement quantity "${requirement.quantityPerItem}" must be a positive integer.`,
            ),
          );
        }
      }
    }

    return ok({
      resolvedOffers: input.selectedOffers.map((selection) => {
        const rentalOffer = rentalOffersById.get(selection.rentalOfferId)!;
        const rentableItem = rentableItemsById.get(rentalOffer.rentableItemId)!;
        const itemRequirements = requirementsByRentableItemId.get(rentableItem.id)!;

        return {
          rentalOfferId: rentalOffer.id,
          rentableItem: {
            id: rentableItem.id,
            name: rentableItem.name,
            kind: rentableItem.kind,
            categoryId: rentableItem.categoryId ?? undefined,
          },
          branchId: rentalOffer.branchId,
          quantity: selection.quantity,
          fulfillmentRequirements: itemRequirements.map((requirement) => ({
            equipmentTypeId: requirement.equipmentTypeId,
            quantityPerItem: requirement.quantityPerItem,
          })),
        };
      }),
    });
  }

  private validateSelectionPayload(
    selections: SelectedRentalOfferInput[],
  ): Result<void, CatalogSelectionResolutionError> {
    if (selections.length === 0) {
      return err(catalogSelectionError('EmptySelection', 'At least one rental offer must be selected.'));
    }

    const seenRentalOfferIds = new Set<string>();

    for (const selection of selections) {
      if (!Number.isInteger(selection.quantity) || selection.quantity <= 0) {
        return err(
          catalogSelectionError('InvalidSelectionQuantity', 'Rental offer quantity must be a positive integer.'),
        );
      }

      if (seenRentalOfferIds.has(selection.rentalOfferId)) {
        return err(
          catalogSelectionError(
            'DuplicateRentalOfferSelection',
            `Rental offer "${selection.rentalOfferId}" was selected more than once.`,
            { rentalOfferId: selection.rentalOfferId },
          ),
        );
      }

      seenRentalOfferIds.add(selection.rentalOfferId);
    }

    return ok(undefined);
  }

  private indexById<T extends { id: string }>(records: T[]): Map<string, T> {
    return new Map(records.map((record) => [record.id, record]));
  }

  private groupRequirementsByRentableItemId(
    requirements: FulfillmentRequirementReadModel[],
  ): Map<string, FulfillmentRequirementReadModel[]> {
    const grouped = new Map<string, FulfillmentRequirementReadModel[]>();

    for (const requirement of requirements) {
      const current = grouped.get(requirement.rentableItemId) ?? [];
      current.push(requirement);
      grouped.set(requirement.rentableItemId, current);
    }

    return grouped;
  }
}

function catalogSelectionError(
  code: CatalogSelectionResolutionError['code'],
  message: string,
  context?: Record<string, unknown>,
): CatalogSelectionResolutionError {
  return new CatalogSelectionResolutionError(code, message, context);
}
