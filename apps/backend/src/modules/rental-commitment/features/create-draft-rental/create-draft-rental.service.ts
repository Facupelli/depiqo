import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { CatalogPublicApi } from 'src/modules/catalog/public-api/catalog.public-api';
import { PricingPublicApi } from 'src/modules/pricing/public-api/pricing.public-api';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';

import { CreateDraftRentalCommand } from './create-draft-rental.command';
import { createDraftRentalError, CreateDraftRentalError } from './create-draft-rental.errors';
import { Rental } from '../../domain/rental.aggregate';
import { RentalDemandLineId } from '../../domain/ids/rental-demand-line-id';
import { RentalSelectionId } from '../../domain/ids/rental-selection-id';
import { EquipmentTypeId } from '../../domain/types/rental-commitment-ids';
import { FulfillmentMethod, RentalSource } from '../../domain/rental-status';
import { RentalRepository } from '../../persistence/rental.repository';
import {
  BranchUnavailableForRentalError,
  DuplicateRentalOfferSelectionError,
  InvalidCatalogSelectionQuantityError,
  PickupTimeOutsideBranchScheduleError,
  RentalCustomerUnavailableForRentalError,
  RentalInvalidFieldError,
  RentalMustContainSelectionError,
  ReturnTimeOutsideBranchScheduleError,
  TenantUnavailableForRentalError,
  UnsupportedBranchFulfillmentMethodError,
} from '../../domain/errors/rental-commitment.errors';

export interface CreateDraftRentalResult {
  rentalId: string;
}

export type CreateDraftRentalServiceResult = Result<CreateDraftRentalResult, CreateDraftRentalError>;

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
    const context = {
      useCase: 'CreateDraftRental',
      tenantId: command.tenantId,
      tenantUserId: command.tenantUserId,
      branchId: command.branchId,
      rentalCustomerId: command.rentalCustomerId,
    };
    const fulfillmentMethod = command.fulfillmentMethod ?? FulfillmentMethod.Pickup;

    const tenantValidation = await this.tenantManagementApi.validateDraftRental({
      tenantId: command.tenantId,
      branchId: command.branchId,
      rentalCustomerId: command.rentalCustomerId,
      period: command.period,
      fulfillmentMethod,
    });
    if (tenantValidation.isErr()) {
      return err(this.toApplicationError(tenantValidation.error, context));
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
      return err(this.toApplicationError(resolvedCatalogSelections.error, context));
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
      return err(this.toApplicationError(pricingResult.error, context));
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
      return err(this.toApplicationError(rental.error, context));
    }

    await this.rentalRepository.save(rental.value);

    return ok({ rentalId: rental.value.id });
  }

  private toApplicationError(error: unknown, context: Record<string, unknown>): CreateDraftRentalError {
    if (error instanceof RentalMustContainSelectionError) {
      return createDraftRentalError('rental_commitment.rental_requires_selection', error.message, error, context);
    }
    if (error instanceof DuplicateRentalOfferSelectionError) {
      return createDraftRentalError('rental_commitment.duplicate_rental_offer_selection', error.message, error, {
        ...context,
        rentalOfferId: error.rentalOfferId,
      });
    }
    if (error instanceof TenantUnavailableForRentalError) {
      return createDraftRentalError('rental_commitment.tenant_unavailable', error.message, error, context);
    }
    if (error instanceof BranchUnavailableForRentalError) {
      return createDraftRentalError('rental_commitment.branch_unavailable', error.message, error, context);
    }
    if (error instanceof RentalCustomerUnavailableForRentalError) {
      return createDraftRentalError('rental_commitment.customer_unavailable', error.message, error, context);
    }
    if (error instanceof UnsupportedBranchFulfillmentMethodError) {
      return createDraftRentalError(
        'rental_commitment.unsupported_branch_fulfillment_method',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof PickupTimeOutsideBranchScheduleError) {
      return createDraftRentalError(
        'rental_commitment.pickup_time_outside_branch_schedule',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof ReturnTimeOutsideBranchScheduleError) {
      return createDraftRentalError(
        'rental_commitment.return_time_outside_branch_schedule',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof RentalInvalidFieldError) {
      return createDraftRentalError('rental_commitment.invalid_rental_field', error.message, error, {
        ...context,
        field: error.field,
      });
    }
    if (error instanceof InvalidCatalogSelectionQuantityError) {
      return createDraftRentalError('rental_commitment.invalid_catalog_selection_quantity', error.message, error, {
        ...context,
        field: error.field,
        quantity: error.quantity,
      });
    }
    if (isErrorWithCode(error, 'INVALID_PRICING_INPUT')) {
      return createDraftRentalError('rental_commitment.invalid_pricing_input', error.message, error, context);
    }

    throw error;
  }
}

function isErrorWithCode(error: unknown, code: string): error is Error & { code: string } {
  return error instanceof Error && 'code' in error && error.code === code;
}
