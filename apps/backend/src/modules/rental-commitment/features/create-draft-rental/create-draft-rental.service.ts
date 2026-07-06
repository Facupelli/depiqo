import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { CatalogPublicApi } from 'src/modules/catalog/public-api/catalog.public-api';
import { PricingPublicApi } from 'src/modules/pricing/public-api/pricing.public-api';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';

import { CreateDraftRentalCommand } from './create-draft-rental.command';
import { toRentalCommitmentApplicationError } from '../create-confirmed-rental/map-rental-commitment-error';
import { RentalCommitmentApplicationError } from '../create-confirmed-rental/rental-commitment-application.error';
import { Rental } from '../../domain/rental.aggregate';
import { RentalDemandLineId } from '../../domain/ids/rental-demand-line-id';
import { RentalSelectionId } from '../../domain/ids/rental-selection-id';
import { EquipmentTypeId } from '../../domain/types/rental-commitment-ids';
import { FulfillmentMethod, RentalSource } from '../../domain/rental-status';
import { RentalRepository } from '../../persistence/rental.repository';

export interface CreateDraftRentalResult {
  rentalId: string;
}

export type CreateDraftRentalServiceResult = Result<CreateDraftRentalResult, RentalCommitmentApplicationError>;

@CommandHandler(CreateDraftRentalCommand)
export class CreateDraftRentalService implements ICommandHandler<
  CreateDraftRentalCommand,
  CreateDraftRentalServiceResult
> {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly tenantManagementApi: TenantManagementPublicApi,
    private readonly catalogApi: CatalogPublicApi,
    private readonly pricingApi: PricingPublicApi,
  ) {}

  async execute(command: CreateDraftRentalCommand): Promise<CreateDraftRentalServiceResult> {
    const fulfillmentMethod = command.fulfillmentMethod ?? FulfillmentMethod.Pickup;

    const tenantValidation = await this.tenantManagementApi.validateDraftRental({
      tenantId: command.tenantId,
      branchId: command.branchId,
      rentalCustomerId: command.rentalCustomerId,
      period: command.period,
      fulfillmentMethod,
    });
    if (tenantValidation.isErr()) {
      return err(toRentalCommitmentApplicationError(tenantValidation.error));
    }

    const resolvedCatalogSelections = await this.catalogApi.resolveSelectedRentalOffers({
      tenantId: command.tenantId,
      branchId: command.branchId,
      selectedOffers: command.selectedOffers.map((selection) => ({
        rentalOfferId: selection.rentalOfferId,
        quantity: selection.quantity,
      })),
    });

    if (resolvedCatalogSelections.isErr()) {
      return err(toRentalCommitmentApplicationError(resolvedCatalogSelections.error));
    }

    const rentalSelectionsDraft = resolvedCatalogSelections.value.resolvedOffers.map((offer) => ({
      rentalSelectionId: RentalSelectionId.create(),
      rentalOfferId: offer.rentalOfferId,
      rentableItemId: offer.rentableItem.id,
      rentableItemNameSnapshot: offer.rentableItem.name,
      rentableItemKindSnapshot: offer.rentableItem.kind,
      categoryId: offer.rentableItem.categoryId,
      quantity: offer.quantity,
      fulfillmentRequirements: offer.fulfillmentRequirements,
    }));

    const pricingResult = await this.pricingApi.priceDraftRental({
      tenantId: command.tenantId,
      branchId: command.branchId,
      customerId: command.rentalCustomerId,
      rentalPeriod: {
        start: command.period.start,
        end: command.period.end,
      },
      pricingConfig: tenantValidation.value.pricingConfig,
      selections: rentalSelectionsDraft.map((selection) => ({
        rentalSelectionId: selection.rentalSelectionId,
        rentalOfferId: selection.rentalOfferId,
        rentableItemId: selection.rentableItemId,
        rentableItemName: selection.rentableItemNameSnapshot,
        rentableItemKind: selection.rentableItemKindSnapshot,
        categoryId: selection.categoryId,
        quantity: selection.quantity,
      })),
      manualPricingAdjustment: command.manualPricingAdjustment
        ? {
            ...command.manualPricingAdjustment,
            setByTenantUserId: command.tenantUserId,
          }
        : undefined,
    });

    if (pricingResult.isErr()) {
      return err(toRentalCommitmentApplicationError(pricingResult.error));
    }

    const equipmentDemandLines = rentalSelectionsDraft.flatMap((selection) =>
      selection.fulfillmentRequirements.map((requirement) => ({
        rentalDemandLineId: RentalDemandLineId.create(),
        rentalSelectionId: selection.rentalSelectionId,
        equipmentTypeId: requirement.equipmentTypeId,
        equipmentNameSnapshot: requirement.equipmentTypeName ?? requirement.equipmentTypeId,
        quantity: selection.quantity * requirement.quantityPerItem,
      })),
    );

    const rental = Rental.createDraft({
      tenantId: command.tenantId,
      branchId: command.branchId,
      rentalCustomerId: command.rentalCustomerId,
      source: RentalSource.Staff,
      fulfillmentMethod,
      notes: command.notes,
      insuranceSelected: command.insuranceSelected,
      bookingSnapshot: command.bookingSnapshot,
      deliveryDetails: fulfillmentMethod === FulfillmentMethod.Delivery ? command.deliveryDetails : undefined,
      priceSnapshot: pricingResult.value,
      period: command.period,

      selections: rentalSelectionsDraft.map((selection) => ({
        id: selection.rentalSelectionId,
        rentalOfferId: selection.rentalOfferId,
        rentableItemId: selection.rentableItemId,
        rentableItemNameSnapshot: selection.rentableItemNameSnapshot,
        rentableItemKindSnapshot: selection.rentableItemKindSnapshot,
        quantity: selection.quantity,
      })),

      demandLines: equipmentDemandLines.map((line) => ({
        id: line.rentalDemandLineId,
        rentalSelectionId: line.rentalSelectionId,
        equipmentTypeId: line.equipmentTypeId as EquipmentTypeId,
        equipmentTypeNameSnapshot: line.equipmentNameSnapshot,
        quantity: line.quantity,
      })),
    });

    if (rental.isErr()) {
      return err(toRentalCommitmentApplicationError(rental.error));
    }

    await this.rentalRepository.save(rental.value);

    return ok({ rentalId: rental.value.id });
  }
}
