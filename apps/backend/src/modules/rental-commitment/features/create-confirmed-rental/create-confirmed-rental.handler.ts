import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { CatalogPublicApi } from 'src/modules/catalog/public-api/catalog.public-api';
import { PricingPublicApi } from 'src/modules/pricing/public-api/pricing.public-api';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';

import { CreateConfirmedRentalCommand } from './create-confirmed-rental.command';
import { Rental } from '../../domain/rental.aggregate';
import { FulfillmentMethod } from '../../domain/rental-status';
import { toRentalCommitmentApplicationError } from './map-rental-commitment-error';
import { RentalCommitmentApplicationError } from './rental-commitment-application.error';
import { RentalRepository } from '../../persistence/rental.repository';
import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import { RentalSelectionId } from '../../domain/ids/rental-selection-id';
import { RentalDemandLineId } from '../../domain/ids/rental-demand-line-id';
import { EquipmentTypeId } from '../../domain/types/rental-commitment-ids';
import { RentalOwnerSplitCalculator } from '../../owner-split/rental-owner-split-calculator';
import { RentalOwnerSplitDraft } from '../../owner-split/owner-split-calculator.types';

export interface CreateConfirmedRentalResult {
  rentalId: string;
}

export type CreateConfirmedRentalServiceResult = Result<CreateConfirmedRentalResult, RentalCommitmentApplicationError>;

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
    const tenantValidation = await this.tenantManagementApi.validateProfessionalConfirmedRentalCreation({
      tenantId: command.tenantId,
      branchId: command.branchId,
      rentalCustomerId: command.rentalCustomerId,
      period: command.period,
      fulfillmentMethod: command.fulfillmentMethod ?? FulfillmentMethod.Pickup,
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
      return err(toRentalCommitmentApplicationError(assetAssignmentPlan.error));
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
      return err(toRentalCommitmentApplicationError(rental.error));
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
      currency: pricingResult.value.calculated.currency,

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

      priceLines: pricingResult.value.calculated.lines.map((line) => ({
        rentalSelectionId: line.rentalSelectionId,
        netAmount: line.total,
      })),
    };

    let splits: RentalOwnerSplitDraft[];
    try {
      ({ splits } = this.rentalOwnerSplitCalculator.calculate(ownerSplitInput));
    } catch (error) {
      return err(toRentalCommitmentApplicationError(error));
    }

    await this.unitOfWork.runInTransaction(async ({ tx, events }) => {
      await this.rentalRepository.save(confirmedRental, { ownerSplits: splits, tx });
      events.collectFrom(confirmedRental);
    });

    return ok({ rentalId: confirmedRental.id });
  }

  private assignmentKey(assetId: string, rentalDemandLineId: string): string {
    return `${rentalDemandLineId}:${assetId}`;
  }
}
