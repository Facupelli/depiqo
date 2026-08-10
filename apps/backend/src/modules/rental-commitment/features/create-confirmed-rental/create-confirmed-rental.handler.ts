import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { PostgresExclusionViolationError } from 'src/core/utils/postgres-error.mapper';
import { CatalogPublicApi } from 'src/modules/catalog/public-api/catalog.public-api';
import { PricingPublicApi } from 'src/modules/pricing/public-api/pricing.public-api';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';

import { toRentalIntegrationEvents } from '../../application/rental-integration-event.mapper';
import { CreateConfirmedRentalCommand } from './create-confirmed-rental.command';
import { Rental } from '../../domain/rental.aggregate';
import { FulfillmentMethod } from '../../domain/rental-status';
import { createConfirmedRentalError, CreateConfirmedRentalError } from './create-confirmed-rental.errors';
import { RentalRepository } from '../../persistence/rental.repository';
import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import { RentalSelectionId } from '../../domain/ids/rental-selection-id';
import { RentalDemandLineId } from '../../domain/ids/rental-demand-line-id';
import { EquipmentTypeId } from '../../domain/types/rental-commitment-ids';
import { RentalOwnerSplitCalculator } from '../../owner-split/rental-owner-split-calculator';
import { RentalOwnerSplitDraft } from '../../owner-split/owner-split-calculator.types';
import {
  BranchUnavailableForRentalError,
  DuplicateAssignedAssetError,
  DuplicateRentalOfferSelectionError,
  EquipmentTypeNotFoundError,
  EquipmentTypeNotRentableError,
  InsufficientAssetAvailabilityError,
  InvalidCatalogSelectionQuantityError,
  InvalidFulfillmentDefinitionError,
  PickupTimeOutsideBranchScheduleError,
  RentableItemNotActiveError,
  RentalOfferNotFoundError,
  RentalOfferNotRentableError,
  ProfessionalConfirmedRentalCreationDisabledError,
  RentalCustomerUnavailableForRentalError,
  RentalInvalidFieldError,
  RentalMustContainSelectionError,
  ReturnTimeOutsideBranchScheduleError,
  TenantUnavailableForRentalError,
  UnsupportedBranchFulfillmentMethodError,
} from '../../domain/errors/rental-commitment.errors';

export interface CreateConfirmedRentalResult {
  rentalId: string;
}

export type CreateConfirmedRentalServiceResult = Result<CreateConfirmedRentalResult, CreateConfirmedRentalError>;

@CommandHandler(CreateConfirmedRentalCommand)
export class CreateConfirmedRentalService implements ICommandHandler<
  CreateConfirmedRentalCommand,
  CreateConfirmedRentalServiceResult
> {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly tenantManagementApi: TenantManagementPublicApi,
    private readonly catalogApi: CatalogPublicApi,
    private readonly pricingApi: PricingPublicApi,
    private readonly rentalAssetAllocation: RentalAssetAllocationService,
    private readonly rentalOwnerSplitCalculator: RentalOwnerSplitCalculator,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: CreateConfirmedRentalCommand): Promise<CreateConfirmedRentalServiceResult> {
    const context = {
      useCase: 'CreateConfirmedRental',
      tenantId: command.tenantId,
      branchId: command.branchId,
      rentalCustomerId: command.rentalCustomerId,
    };
    const tenantValidation = await this.tenantManagementApi.validateProfessionalConfirmedRentalCreation({
      tenantId: command.tenantId,
      branchId: command.branchId,
      rentalCustomerId: command.rentalCustomerId,
      period: command.period,
      fulfillmentMethod: command.fulfillmentMethod ?? FulfillmentMethod.Pickup,
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

    const pricingResult = await this.pricingApi.priceConfirmedRental({
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

    const assetAssignmentPlan = await this.rentalAssetAllocation.planAllocations({
      tenantId: command.tenantId,
      branchId: command.branchId,
      periodStart: command.period.start,
      periodEnd: command.period.end,
      demandLines: equipmentDemandLines.map((line) => ({
        rentalDemandLineId: line.rentalDemandLineId,
        rentalSelectionId: line.rentalSelectionId,
        equipmentTypeId: line.equipmentTypeId as EquipmentTypeId,
        quantity: line.quantity,
      })),
    });

    if (assetAssignmentPlan.isErr()) {
      return err(this.toApplicationError(assetAssignmentPlan.error, context));
    }

    const rental = Rental.createConfirmed({
      tenantId: command.tenantId,
      branchId: command.branchId,
      rentalCustomerId: command.rentalCustomerId,
      fulfillmentMethod: command.fulfillmentMethod ?? FulfillmentMethod.Pickup,
      notes: command.notes,
      insuranceSelected: command.insuranceSelected,
      bookingSnapshot: command.bookingSnapshot,
      deliveryDetails: command.fulfillmentMethod === FulfillmentMethod.Delivery ? command.deliveryDetails : undefined,
      confirmedPriceSnapshot: pricingResult.value,
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

      assignedAssets: assetAssignmentPlan.value.allocations.map((allocation) => ({
        rentalDemandLineId: allocation.rentalDemandLineId,
        assetId: allocation.assetId,
      })),
    });

    if (rental.isErr()) {
      return err(this.toApplicationError(rental.error, context));
    }

    const confirmedRental = rental.value;

    const assignmentsByAssetAndDemandLine = new Map(
      confirmedRental.assignedAssets.map((assignment) => [
        this.assignmentKey(assignment.assetId, assignment.rentalDemandLineId),
        assignment,
      ]),
    );

    // TODO: make part of Rental Aggregate
    const ownerSplitInput = {
      tenantId: confirmedRental.tenantId,
      rentalId: confirmedRental.id,
      currency: pricingResult.value.final.currency,

      selections: confirmedRental.selections.map((selection) => ({
        id: selection.id,
      })),

      demandLines: confirmedRental.demandLines.map((demandLine) => ({
        id: demandLine.id,
        sourceSelectionId: demandLine.rentalSelectionId,
      })),

      fulfilledAssets: assetAssignmentPlan.value.allocations.map((allocation) => {
        const assignment = assignmentsByAssetAndDemandLine.get(
          this.assignmentKey(allocation.assetId, allocation.rentalDemandLineId),
        );

        return {
          id: assignment?.id ?? allocation.assetId,
          rentalDemandLineId: allocation.rentalDemandLineId,
          assetId: allocation.assetId,
          ownershipKind: allocation.ownershipKind,
          ownerId: allocation.ownerId ?? null,
          ownerContractSnapshot: allocation.ownerContractSnapshot
            ? {
                contractId: allocation.ownerContractSnapshot.contractId,
                basis: allocation.ownerContractSnapshot.basis,
                ownerShare: String(allocation.ownerContractSnapshot.ownerShare),
              }
            : null,
        };
      }),

      priceLines: pricingResult.value.final.lines.map((line) => ({
        rentalSelectionId: line.rentalSelectionId,
        netAmount: line.total,
      })),
    };

    const { splits }: { splits: RentalOwnerSplitDraft[] } = this.rentalOwnerSplitCalculator.calculate(ownerSplitInput);

    try {
      await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
        await this.rentalRepository.save(confirmedRental, { ownerSplits: splits, tx });
        integrationEvents.collect(toRentalIntegrationEvents(confirmedRental.pullDomainEvents()));
      });
    } catch (error) {
      if (error instanceof PostgresExclusionViolationError) {
        return err(
          createConfirmedRentalError(
            'rental_commitment.insufficient_asset_availability',
            'The requested equipment is no longer available.',
            error,
            context,
          ),
        );
      }
      throw error;
    }

    return ok({ rentalId: confirmedRental.id });
  }

  private assignmentKey(assetId: string, rentalDemandLineId: string): string {
    return `${rentalDemandLineId}:${assetId}`;
  }

  private toApplicationError(error: unknown, context: Record<string, unknown>): CreateConfirmedRentalError {
    if (error instanceof RentalMustContainSelectionError) {
      return createConfirmedRentalError('rental_commitment.rental_requires_selection', error.message, error, context);
    }
    if (error instanceof RentalOfferNotFoundError) {
      return createConfirmedRentalError('rental_commitment.rental_offer_not_found', error.message, error, context);
    }
    if (error instanceof RentalOfferNotRentableError || error instanceof RentableItemNotActiveError) {
      return createConfirmedRentalError(
        'rental_commitment.catalog_selection_unavailable',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof InvalidFulfillmentDefinitionError) {
      return createConfirmedRentalError(
        'rental_commitment.invalid_fulfillment_definition',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof DuplicateRentalOfferSelectionError) {
      return createConfirmedRentalError('rental_commitment.duplicate_rental_offer_selection', error.message, error, {
        ...context,
        rentalOfferId: error.rentalOfferId,
      });
    }
    if (error instanceof InsufficientAssetAvailabilityError) {
      return createConfirmedRentalError('rental_commitment.insufficient_asset_availability', error.message, error, {
        ...context,
        equipmentTypeId: error.equipmentTypeId,
        rentalSelectionId: error.rentalSelectionId,
        requiredQuantity: error.requiredQuantity,
        availableQuantity: error.availableQuantity,
      });
    }
    if (error instanceof ProfessionalConfirmedRentalCreationDisabledError) {
      return createConfirmedRentalError(
        'rental_commitment.confirmed_rental_creation_disabled',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof TenantUnavailableForRentalError) {
      return createConfirmedRentalError('rental_commitment.tenant_unavailable', error.message, error, context);
    }
    if (error instanceof BranchUnavailableForRentalError) {
      return createConfirmedRentalError('rental_commitment.branch_unavailable', error.message, error, context);
    }
    if (error instanceof RentalCustomerUnavailableForRentalError) {
      return createConfirmedRentalError('rental_commitment.customer_unavailable', error.message, error, context);
    }
    if (error instanceof EquipmentTypeNotFoundError) {
      return createConfirmedRentalError('rental_commitment.equipment_type_not_found', error.message, error, {
        ...context,
        equipmentTypeId: error.equipmentTypeId,
      });
    }
    if (error instanceof EquipmentTypeNotRentableError) {
      return createConfirmedRentalError('rental_commitment.equipment_type_not_rentable', error.message, error, {
        ...context,
        equipmentTypeId: error.equipmentTypeId,
      });
    }
    if (error instanceof UnsupportedBranchFulfillmentMethodError) {
      return createConfirmedRentalError(
        'rental_commitment.unsupported_branch_fulfillment_method',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof PickupTimeOutsideBranchScheduleError) {
      return createConfirmedRentalError(
        'rental_commitment.pickup_time_outside_branch_schedule',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof ReturnTimeOutsideBranchScheduleError) {
      return createConfirmedRentalError(
        'rental_commitment.return_time_outside_branch_schedule',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof RentalInvalidFieldError) {
      return createConfirmedRentalError('rental_commitment.invalid_rental_field', error.message, error, {
        ...context,
        field: error.field,
      });
    }
    if (error instanceof InvalidCatalogSelectionQuantityError) {
      return createConfirmedRentalError('rental_commitment.invalid_catalog_selection_quantity', error.message, error, {
        ...context,
        field: error.field,
        quantity: error.quantity,
      });
    }
    if (isErrorWithCode(error, 'INVALID_PRICING_INPUT')) {
      return createConfirmedRentalError('rental_commitment.invalid_pricing_input', error.message, error, context);
    }
    if (error instanceof DuplicateAssignedAssetError) {
      return createConfirmedRentalError('rental_commitment.duplicate_assigned_asset', error.message, error, context);
    }

    throw error;
  }
}

function isErrorWithCode(error: unknown, code: string): error is Error & { code: string } {
  return error instanceof Error && 'code' in error && error.code === code;
}
