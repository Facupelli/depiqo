import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import {
  CatalogSelectionResolutionError,
  ResolveSelectedRentalOfferRequirementsInput,
  ResolveSelectedRentalOfferRequirementsResult,
  ResolveSelectedRentalOffersInput,
  ResolveSelectedRentalOffersResult,
  SelectedRentalOfferInput,
} from '../../public-api/catalog-selection-resolution.public-api';
import {
  FulfillmentRequirementReadModel,
  PrismaResolveSelectedRentalOffersReader,
  RentalOfferReadModel,
  RentableItemReadModel,
} from './prisma-resolve-selected-rental-offers.reader';

type SelectableOffer = {
  rentalOffer: RentalOfferReadModel;
  rentableItem: RentableItemReadModel;
  requirements: FulfillmentRequirementReadModel[];
};

type UnavailableOffer = {
  rentalOfferId: string;
  code: 'RentalOfferNotFound' | 'RentalOfferNotRentable' | 'RentableItemNotActive';
  rentableItemId?: string;
};

type SelectedOfferRecords = {
  resolvedOffers: SelectableOffer[];
  unavailableOffers: UnavailableOffer[];
  validationError?: CatalogSelectionResolutionError;
};

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

    const records = await this.resolveSelectedOfferRecords({
      tenantId: input.tenantId,
      branchId: input.branchId,
      rentalOfferIds: input.selectedOffers.map((selection) => selection.rentalOfferId),
    });

    if (records.isErr()) {
      return err(records.error);
    }

    const unavailableOffer = records.value.unavailableOffers[0];
    if (unavailableOffer) {
      return err(this.unavailableOfferError(unavailableOffer));
    }
    if (records.value.validationError) {
      return err(records.value.validationError);
    }

    const quantityByRentalOfferId = new Map(
      input.selectedOffers.map((selection) => [selection.rentalOfferId, selection.quantity]),
    );

    return ok({
      resolvedOffers: records.value.resolvedOffers.map(({ rentalOffer, rentableItem, requirements }) => ({
        rentalOfferId: rentalOffer.id,
        rentableItem: {
          id: rentableItem.id,
          name: rentableItem.name,
          kind: rentableItem.kind,
          categoryId: rentableItem.categoryId ?? undefined,
        },
        branchId: rentalOffer.branchId,
        quantity: quantityByRentalOfferId.get(rentalOffer.id)!,
        fulfillmentRequirements: requirements.map((requirement) => ({
          equipmentTypeId: requirement.equipmentTypeId,
          quantityPerItem: requirement.quantityPerItem,
        })),
      })),
    });
  }

  async resolveSelectedRentalOfferRequirements(
    input: ResolveSelectedRentalOfferRequirementsInput,
  ): Promise<Result<ResolveSelectedRentalOfferRequirementsResult, CatalogSelectionResolutionError>> {
    const payloadValidation = this.validateSelectionPayload(
      input.rentalOfferIds.map((rentalOfferId) => ({ rentalOfferId, quantity: 1 })),
    );

    if (payloadValidation.isErr()) {
      return err(payloadValidation.error);
    }

    const records = await this.resolveSelectedOfferRecords(input);

    if (records.isErr()) {
      return err(records.error);
    }
    if (records.value.validationError) {
      return err(records.value.validationError);
    }

    return ok({
      resolvedOffers: records.value.resolvedOffers.map(({ rentalOffer, requirements }) => ({
        rentalOfferId: rentalOffer.id,
        fulfillmentRequirements: requirements.map((requirement) => ({
          equipmentTypeId: requirement.equipmentTypeId,
          quantityPerItem: requirement.quantityPerItem,
        })),
      })),
      unavailableOffers: records.value.unavailableOffers.map((offer) => ({ ...offer })),
    });
  }

  private async resolveSelectedOfferRecords(
    input: ResolveSelectedRentalOfferRequirementsInput,
  ): Promise<Result<SelectedOfferRecords, CatalogSelectionResolutionError>> {
    const rentalOffers = await this.reader.findRentalOffers({
      tenantId: input.tenantId,
      branchId: input.branchId,
      rentalOfferIds: input.rentalOfferIds,
    });
    const rentalOffersById = this.indexById(rentalOffers);
    const unavailableOffers: UnavailableOffer[] = [];
    const selectableRentalOffers: RentalOfferReadModel[] = [];

    for (const rentalOfferId of input.rentalOfferIds) {
      const rentalOffer = rentalOffersById.get(rentalOfferId);

      if (!rentalOffer) {
        unavailableOffers.push({ rentalOfferId, code: 'RentalOfferNotFound' });
        continue;
      }

      if (!rentalOffer.isRentable) {
        unavailableOffers.push({ rentalOfferId, code: 'RentalOfferNotRentable' });
        continue;
      }

      selectableRentalOffers.push(rentalOffer);
    }

    const rentableItemIds = [...new Set(selectableRentalOffers.map((offer) => offer.rentableItemId))];
    const rentableItems = await this.reader.findRentableItems({
      tenantId: input.tenantId,
      rentableItemIds,
    });
    const rentableItemsById = this.indexById(rentableItems);
    const activeOffers: Array<{ rentalOffer: RentalOfferReadModel; rentableItem: RentableItemReadModel }> = [];

    for (const rentalOffer of selectableRentalOffers) {
      const rentableItem = rentableItemsById.get(rentalOffer.rentableItemId);

      if (!rentableItem || rentableItem.status !== 'ACTIVE') {
        unavailableOffers.push({
          rentalOfferId: rentalOffer.id,
          code: 'RentableItemNotActive',
          rentableItemId: rentalOffer.rentableItemId,
        });
        continue;
      }

      activeOffers.push({ rentalOffer, rentableItem });
    }

    const requirements = await this.reader.findFulfillmentRequirements({
      tenantId: input.tenantId,
      rentableItemIds: [...new Set(activeOffers.map((offer) => offer.rentableItem.id))],
    });
    const requirementsByRentableItemId = this.groupRequirementsByRentableItemId(requirements);

    let validationError: CatalogSelectionResolutionError | undefined;

    for (const rentableItemId of new Set(activeOffers.map((offer) => offer.rentableItem.id))) {
      const itemRequirements = requirementsByRentableItemId.get(rentableItemId) ?? [];

      if (itemRequirements.length === 0) {
        validationError ??= catalogSelectionError(
          'InvalidFulfillmentDefinition',
          `Rentable item "${rentableItemId}" has no fulfillment requirements.`,
        );
        continue;
      }

      for (const requirement of itemRequirements) {
        if (!Number.isInteger(requirement.quantityPerItem) || requirement.quantityPerItem <= 0) {
          validationError ??= catalogSelectionError(
            'InvalidFulfillmentDefinition',
            `Fulfillment requirement quantity "${requirement.quantityPerItem}" must be a positive integer.`,
          );
          break;
        }
      }
    }

    return ok({
      resolvedOffers: activeOffers.map(({ rentalOffer, rentableItem }) => ({
        rentalOffer,
        rentableItem,
        requirements: requirementsByRentableItemId.get(rentableItem.id) ?? [],
      })),
      unavailableOffers,
      validationError,
    });
  }

  private unavailableOfferError(offer: UnavailableOffer): CatalogSelectionResolutionError {
    switch (offer.code) {
      case 'RentalOfferNotFound':
        return catalogSelectionError('RentalOfferNotFound', `Rental offer "${offer.rentalOfferId}" was not found.`, {
          rentalOfferId: offer.rentalOfferId,
        });
      case 'RentalOfferNotRentable':
        return catalogSelectionError(
          'RentalOfferNotRentable',
          `Rental offer "${offer.rentalOfferId}" is not rentable.`,
          { rentalOfferId: offer.rentalOfferId },
        );
      case 'RentableItemNotActive':
        return catalogSelectionError(
          'RentableItemNotActive',
          `Rentable item "${offer.rentableItemId}" is not active.`,
          { rentalOfferId: offer.rentalOfferId },
        );
    }
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
