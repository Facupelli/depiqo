import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import {
  isPrismaRawQueryPostgresDeadlock,
  PostgresExclusionViolationError,
} from 'src/core/utils/postgres-error.mapper';
import { V2AssetBlockType } from 'src/generated/prisma/enums';
import { TenantRentalAssetBufferSettings } from 'src/modules/tenant-management/public-api/tenant-rental-asset-buffer-settings.public-api';
import { RentalOperationalFactsValidatorService } from '../../application/rental-operational-facts-validator.service';

import { toRentalIntegrationEvents } from '../../application/rental-integration-event.mapper';
import { deriveBufferedAssetBlockPeriod } from '../../domain/asset-block-period';
import { deriveConfirmationParticipationTiming } from '../../domain/confirmation-participation-timing';
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
} from '../../domain/errors/rental-commitment.errors';
import { EquipmentTypeId } from '../../domain/types/rental-commitment-ids';
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
    private readonly rentalOperationalFacts: RentalOperationalFactsValidatorService,
    private readonly tenantRentalAssetBufferSettings: TenantRentalAssetBufferSettings,
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

    const fulfillmentMethod = rental.fulfillmentMethod;

    const tenantValidation = await this.rentalOperationalFacts.validateDraftFacts({
      tenantId: rental.tenantId,
      branchId: rental.branchId,
      rentalCustomerId: rental.rentalCustomerId,
      fulfillmentMethod,
    });

    if (tenantValidation.isErr()) {
      return err(this.toApplicationError(tenantValidation.error, context));
    }

    const bufferSettings = await this.tenantRentalAssetBufferSettings.getTenantRentalAssetBufferSettings({
      tenantId: rental.tenantId,
    });
    if (bufferSettings.isErr()) {
      return err(
        confirmRentalError(
          'rental_commitment.tenant_unavailable',
          bufferSettings.error.message,
          bufferSettings.error,
          context,
        ),
      );
    }

    const operationTime = new Date();
    const participationTiming = deriveConfirmationParticipationTiming(rental.period, operationTime);
    const acceptedAssetBuffer = { ...bufferSettings.value };
    const operationalPeriod = deriveBufferedAssetBlockPeriod({
      participationPeriod: participationTiming.participationPeriod,
      ...acceptedAssetBuffer,
      clampStartAt: participationTiming.blockOperationTime,
    });

    const assetAssignmentPlan = await this.rentalAssetAllocation.planAllocations({
      tenantId: rental.tenantId,
      branchId: rental.branchId,
      periodStart: operationalPeriod.start,
      periodEnd: operationalPeriod.end,
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
      acceptedAssetBuffer,
      confirmedAt: operationTime,
      assignedAssets: assetAssignmentPlan.value.allocations.map((allocation) => ({
        rentalDemandLineId: allocation.rentalDemandLineId,
        assetId: allocation.assetId,
        ownershipSnapshot: allocation.ownershipSnapshot,
      })),
    });

    if (confirmResult.isErr()) {
      return err(this.toApplicationError(confirmResult.error, context));
    }

    if (!rental.confirmedPriceSnapshot) {
      return err(this.toApplicationError(new ConfirmedRentalRequiresPriceSnapshotError(rental.id), context));
    }

    const confirmedPriceSnapshot = getConfirmedPriceSnapshotForOwnerSplits(rental.confirmedPriceSnapshot);

    const { splits }: { splits: RentalOwnerSplitDraft[] } = this.rentalOwnerSplitCalculator.calculate({
      tenantId: rental.tenantId,
      rentalId: rental.id,
      currency: confirmedPriceSnapshot.currency,
      selections: rental.selections.map((selection) => ({ id: selection.id })),
      demandLines: rental.demandLines.map((demandLine) => ({
        id: demandLine.id,
        sourceSelectionId: demandLine.rentalSelectionId,
      })),
      fulfilledAssets: rental.currentAssignedAssets.map((assignment) => ({
        id: assignment.id,
        rentalDemandLineId: assignment.rentalDemandLineId,
        assetId: assignment.assetId,
        ownershipSnapshot: assignment.ownershipSnapshot.toJSON(),
      })),
      priceLines: confirmedPriceSnapshot.lines.map((line) => ({
        rentalSelectionId: line.rentalSelectionId,
        netAmount: line.total,
      })),
    });

    const persistConfirmation = () =>
      this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
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

    try {
      let persistence: ConfirmRentalResult;
      try {
        persistence = await persistConfirmation();
      } catch (error) {
        if (!isPrismaRawQueryPostgresDeadlock(error)) throw error;
        persistence = await persistConfirmation();
      }

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

    throw error;
  }
}
