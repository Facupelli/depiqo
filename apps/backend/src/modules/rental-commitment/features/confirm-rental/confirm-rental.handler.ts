import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { PostgresExclusionViolationError } from 'src/core/utils/postgres-error.mapper';
import { V2AssetBlockType } from 'src/generated/prisma/enums';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';

import { toRentalIntegrationEvents } from '../../application/rental-integration-event.mapper';
import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import {
  BranchUnavailableForRentalError,
  ConfirmedRentalRequiresPriceSnapshotError,
  DuplicateAssignedAssetError,
  InsufficientAssetAvailabilityError,
  RentalCannotBeConfirmedFromStatusError,
  RentalConfirmationRequiresCustomerError,
  RentalCustomerUnavailableForRentalError,
  RentalInvalidFieldError,
  TenantUnavailableForRentalError,
  UnsupportedBranchFulfillmentMethodError,
} from '../../domain/errors/rental-commitment.errors';
import { FulfillmentMethod } from '../../domain/rental-status';
import { AssetId, EquipmentTypeId } from '../../domain/types/rental-commitment-ids';
import { getConfirmedPriceSnapshotForOwnerSplits } from '../../owner-split/confirmed-price-snapshot-for-owner-splits';
import { RentalOwnerSplitDraft } from '../../owner-split/owner-split-calculator.types';
import { RentalOwnerSplitCalculator } from '../../owner-split/rental-owner-split-calculator';
import { RentalRepository } from '../../persistence/rental.repository';
import { ConfirmRentalCommand } from './confirm-rental.command';
import { confirmRentalError, ConfirmRentalError } from './confirm-rental.errors';

export type ConfirmRentalResult = Result<void, ConfirmRentalError>;

@CommandHandler(ConfirmRentalCommand)
export class ConfirmRentalHandler implements ICommandHandler<ConfirmRentalCommand, ConfirmRentalResult> {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly tenantManagementApi: TenantManagementPublicApi,
    private readonly rentalAssetAllocation: RentalAssetAllocationService,
    private readonly rentalOwnerSplitCalculator: RentalOwnerSplitCalculator,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: ConfirmRentalCommand): Promise<ConfirmRentalResult> {
    const context = {
      useCase: 'ConfirmRental',
      tenantId: command.tenantId,
      rentalId: command.rentalId,
    };
    const rental = await this.rentalRepository.findById(command.tenantId, command.rentalId);

    if (!rental) {
      return err(
        confirmRentalError(
          'rental_commitment.rental_not_found',
          `Rental "${command.rentalId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    const expectedVersion = rental.version;

    if (!rental.rentalCustomerId) {
      const error = new RentalConfirmationRequiresCustomerError(rental.id);
      return err(this.toApplicationError(error, context));
    }

    const fulfillmentMethod = rental.fulfillmentMethod ?? FulfillmentMethod.Pickup;

    const tenantValidation = await this.tenantManagementApi.validateDraftRental({
      tenantId: rental.tenantId,
      branchId: rental.branchId,
      rentalCustomerId: rental.rentalCustomerId,
      period: rental.period,
      fulfillmentMethod,
    });

    if (tenantValidation.isErr()) {
      return err(this.toApplicationError(tenantValidation.error, context));
    }

    const assetAssignmentPlan = await this.rentalAssetAllocation.planAllocations({
      tenantId: rental.tenantId,
      branchId: rental.branchId,
      periodStart: rental.period.start,
      periodEnd: rental.period.end,
      demandLines: rental.demandLines.map((line) => ({
        rentalDemandLineId: line.id,
        rentalSelectionId: line.rentalSelectionId,
        equipmentTypeId: line.equipmentTypeId as EquipmentTypeId,
        quantity: line.quantity,
      })),
      ignoredBlockScope: {
        rentalId: rental.id,
        blockType: V2AssetBlockType.EQUIPMENT,
      },
    });

    if (assetAssignmentPlan.isErr()) {
      return err(this.toApplicationError(assetAssignmentPlan.error, context));
    }

    const confirmResult = rental.confirm({
      assignedAssets: assetAssignmentPlan.value.allocations.map((allocation) => ({
        rentalDemandLineId: allocation.rentalDemandLineId,
        assetId: allocation.assetId,
      })),
    });

    if (confirmResult.isErr()) {
      return err(this.toApplicationError(confirmResult.error, context));
    }

    if (!rental.confirmedPriceSnapshot) {
      return err(this.toApplicationError(new ConfirmedRentalRequiresPriceSnapshotError(rental.id), context));
    }

    const confirmedPriceSnapshot = getConfirmedPriceSnapshotForOwnerSplits(rental.confirmedPriceSnapshot);

    const assignmentsByAssetAndDemandLine = new Map(
      rental.assignedAssets.map((assignment) => [
        this.assignmentKey(assignment.assetId, assignment.rentalDemandLineId),
        assignment,
      ]),
    );

    const { splits }: { splits: RentalOwnerSplitDraft[] } = this.rentalOwnerSplitCalculator.calculate({
      tenantId: rental.tenantId,
      rentalId: rental.id,
      currency: confirmedPriceSnapshot.calculated.currency,
      selections: rental.selections.map((selection) => ({ id: selection.id })),
      demandLines: rental.demandLines.map((demandLine) => ({
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
      priceLines: confirmedPriceSnapshot.calculated.lines.map((line) => ({
        rentalSelectionId: line.rentalSelectionId,
        netAmount: line.total,
      })),
    });

    try {
      const persistence = await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
        const saved = await this.rentalRepository.save(rental, { expectedVersion, ownerSplits: splits, tx });
        if (!saved) {
          return err(
            confirmRentalError(
              'rental_commitment.rental_version_conflict',
              `Rental "${command.rentalId}" was modified by another request.`,
              undefined,
              context,
            ),
          );
        }

        integrationEvents.collect(toRentalIntegrationEvents(rental.pullDomainEvents()));
        return ok(undefined);
      });
      if (persistence.isErr()) return persistence;
    } catch (error) {
      if (error instanceof PostgresExclusionViolationError) {
        return err(
          confirmRentalError(
            'rental_commitment.insufficient_asset_availability',
            'The requested equipment is no longer available.',
            error,
            context,
          ),
        );
      }
      throw error;
    }

    return ok(undefined);
  }

  private assignmentKey(assetId: AssetId, rentalDemandLineId: string): string {
    return `${rentalDemandLineId}:${assetId}`;
  }

  private toApplicationError(error: unknown, context: Record<string, unknown>): ConfirmRentalError {
    if (error instanceof RentalCannotBeConfirmedFromStatusError) {
      return confirmRentalError(
        'rental_commitment.rental_cannot_be_confirmed_from_status',
        error.message,
        error,
        context,
      );
    }

    if (error instanceof RentalConfirmationRequiresCustomerError) {
      return confirmRentalError(
        'rental_commitment.rental_confirmation_requires_customer',
        error.message,
        error,
        context,
      );
    }

    if (error instanceof ConfirmedRentalRequiresPriceSnapshotError) {
      return confirmRentalError(
        'rental_commitment.confirmed_rental_requires_price_snapshot',
        error.message,
        error,
        context,
      );
    }

    if (error instanceof InsufficientAssetAvailabilityError) {
      return confirmRentalError('rental_commitment.insufficient_asset_availability', error.message, error, {
        ...context,
        equipmentTypeId: error.equipmentTypeId,
        rentalSelectionId: error.rentalSelectionId,
        requiredQuantity: error.requiredQuantity,
        availableQuantity: error.availableQuantity,
      });
    }

    if (error instanceof DuplicateAssignedAssetError) {
      return confirmRentalError('rental_commitment.duplicate_assigned_asset', error.message, error, context);
    }

    if (error instanceof RentalInvalidFieldError) {
      return confirmRentalError('rental_commitment.invalid_rental_field', error.message, error, {
        ...context,
        field: error.field,
      });
    }

    if (error instanceof TenantUnavailableForRentalError) {
      return confirmRentalError('rental_commitment.tenant_unavailable', error.message, error, context);
    }

    if (error instanceof BranchUnavailableForRentalError) {
      return confirmRentalError('rental_commitment.branch_unavailable', error.message, error, context);
    }

    if (error instanceof RentalCustomerUnavailableForRentalError) {
      return confirmRentalError('rental_commitment.customer_unavailable', error.message, error, context);
    }

    if (error instanceof UnsupportedBranchFulfillmentMethodError) {
      return confirmRentalError(
        'rental_commitment.unsupported_branch_fulfillment_method',
        error.message,
        error,
        context,
      );
    }

    throw error;
  }
}
