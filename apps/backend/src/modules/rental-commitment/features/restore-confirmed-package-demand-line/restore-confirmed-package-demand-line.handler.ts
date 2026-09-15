import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { PostgresExclusionViolationError } from 'src/core/utils/postgres-error.mapper';

import { toRentalIntegrationEvents } from '../../application/rental-integration-event.mapper';
import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import { deriveConfirmedAssetBlockPeriod } from '../../domain/confirmed-asset-block-period';
import {
  InsufficientAssetAvailabilityError,
  RentalCannotBeEditedFromStatusError,
  RentalDemandLineNotFoundError,
  RentalInvalidFieldError,
  RentalPeriodHasEndedError,
  RentalSelectionNotFoundError,
} from '../../domain/errors/rental-commitment.errors';
import { RentalStatus, RentableItemKind } from '../../domain/rental-status';
import { Rental } from '../../domain/rental.aggregate';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { getConfirmedPriceSnapshotForOwnerSplits } from '../../owner-split/confirmed-price-snapshot-for-owner-splits';
import { RentalOwnerSplitDraft } from '../../owner-split/owner-split-calculator.types';
import { RentalOwnerSplitCalculator } from '../../owner-split/rental-owner-split-calculator';
import { RentalRepository } from '../../persistence/rental.repository';
import { RestoreConfirmedPackageDemandLineCommand } from './restore-confirmed-package-demand-line.command';
import {
  RestoreConfirmedPackageDemandLineError,
  restoreConfirmedPackageDemandLineError,
} from './restore-confirmed-package-demand-line.errors';

export type RestoreConfirmedPackageDemandLineResult = Result<
  { rentalId: string; version: number; updatedAt: Date },
  RestoreConfirmedPackageDemandLineError
>;

@CommandHandler(RestoreConfirmedPackageDemandLineCommand)
export class RestoreConfirmedPackageDemandLineHandler implements ICommandHandler<
  RestoreConfirmedPackageDemandLineCommand,
  RestoreConfirmedPackageDemandLineResult
> {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly allocation: RentalAssetAllocationService,
    private readonly splitCalculator: RentalOwnerSplitCalculator,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: RestoreConfirmedPackageDemandLineCommand): Promise<RestoreConfirmedPackageDemandLineResult> {
    const { tenantId, tenantUserId, rentalId, demandLineId, expectedVersion, quantity } = command.props;
    const context = {
      useCase: 'RestoreConfirmedPackageDemandLine',
      tenantId,
      tenantUserId,
      rentalId,
      demandLineId,
      quantity,
    };

    try {
      return await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
        const rental = await this.rentalRepository.findById(tenantId, rentalId, tx);
        if (!rental) {
          return err(this.error('rental_commitment.rental_not_found', `Rental "${rentalId}" was not found.`, context));
        }
        if (rental.version !== expectedVersion) {
          return err(
            this.error(
              'rental_commitment.rental_version_conflict',
              `Rental "${rentalId}" was modified by another request.`,
              context,
            ),
          );
        }

        if (rental.status !== RentalStatus.Confirmed) {
          return err(this.map(new RentalCannotBeEditedFromStatusError(rentalId, rental.status), context));
        }

        const demandLine = rental.demandLines.find((candidate) => candidate.id === demandLineId);
        if (!demandLine) {
          return err(this.map(new RentalDemandLineNotFoundError(rentalId, demandLineId), context));
        }
        if (demandLine.removedQuantity === 0) {
          return err(
            this.error(
              'rental_commitment.rental_demand_line_already_current',
              `Rental demand line "${demandLineId}" is fully operational.`,
              context,
            ),
          );
        }

        const parentSelection = rental.selections.find((selection) => selection.id === demandLine.rentalSelectionId);
        if (!parentSelection) {
          return err(this.map(new RentalSelectionNotFoundError(rentalId, demandLine.rentalSelectionId), context));
        }
        if (parentSelection.rentableItemKindSnapshot !== RentableItemKind.Package || !parentSelection.isCurrent) {
          return err(
            this.map(
              new RentalInvalidFieldError(
                'demandLineId',
                parentSelection.rentableItemKindSnapshot !== RentableItemKind.Package
                  ? 'must belong to a PACKAGE selection'
                  : 'must belong to a current selection',
              ),
              context,
            ),
          );
        }

        const operationTime = new Date();
        const effectiveAt = operationTime < rental.period.start ? rental.period.start : operationTime;
        if (effectiveAt >= rental.period.end) {
          return err(this.map(new RentalPeriodHasEndedError(rentalId), context));
        }
        if (!Number.isInteger(quantity) || quantity <= 0) {
          return err(this.map(new RentalInvalidFieldError('quantity', 'must be a positive integer'), context));
        }
        if (quantity > demandLine.removedQuantity) {
          return err(this.map(new RentalInvalidFieldError('quantity', 'must not exceed removedQuantity'), context));
        }

        const acceptedAssetBuffer = rental.requireAcceptedAssetBuffer();
        const operationalPeriod = deriveConfirmedAssetBlockPeriod({
          participationPeriod: new RentalPeriod(effectiveAt, rental.period.end),
          acceptedBeforeBufferMinutes: acceptedAssetBuffer.beforeBufferMinutes,
          acceptedAfterBufferMinutes: acceptedAssetBuffer.afterBufferMinutes,
          acceptedDelivery: rental.acceptedDelivery,
          clampStartAt: operationTime,
        });
        const plan = await this.allocation.planAllocations({
          tenantId,
          branchId: rental.branchId,
          periodStart: operationalPeriod.start,
          periodEnd: operationalPeriod.end,
          demandLines: [
            {
              rentalDemandLineId: demandLine.id,
              rentalSelectionId: demandLine.rentalSelectionId,
              equipmentTypeId: demandLine.equipmentTypeId,
              quantity,
            },
          ],
          excludeAssetIds: rental.currentAssignedAssets.map((assignment) => assignment.assetId),
          tx,
        });
        if (plan.isErr()) return err(this.map(plan.error, context));

        const restored = rental.restoreConfirmedPackageDemandLine({
          demandLineId,
          quantity,
          assignedAssets: plan.value.allocations.map((allocation) => ({
            rentalDemandLineId: allocation.rentalDemandLineId,
            assetId: allocation.assetId,
            ownershipSnapshot: allocation.ownershipSnapshot,
          })),
          operationTime,
        });
        if (restored.isErr()) return err(this.map(restored.error, context));

        const ownerSplits = this.calculateOwnerSplits(rental);
        const saved = await this.rentalRepository.save(rental, { expectedVersion, ownerSplits, tx });
        if (!saved) {
          return err(
            this.error(
              'rental_commitment.rental_version_conflict',
              `Rental "${rentalId}" was modified by another request.`,
              context,
            ),
          );
        }

        integrationEvents.collect(toRentalIntegrationEvents(rental.pullDomainEvents()));
        return ok({ rentalId, version: saved.version, updatedAt: saved.updatedAt });
      });
    } catch (error) {
      if (error instanceof PostgresExclusionViolationError) {
        return err(
          this.error(
            'rental_commitment.insufficient_asset_availability',
            'The required equipment is no longer available.',
            context,
            error,
          ),
        );
      }
      throw error;
    }
  }

  private calculateOwnerSplits(rental: Rental): RentalOwnerSplitDraft[] {
    const snapshot = getConfirmedPriceSnapshotForOwnerSplits(rental.confirmedPriceSnapshot);
    return this.splitCalculator.calculate({
      tenantId: rental.tenantId,
      rentalId: rental.id,
      currency: snapshot.currency,
      selections: rental.currentSelections.map(({ id }) => ({ id })),
      demandLines: rental.currentDemandLines.map((line) => ({
        id: line.id,
        sourceSelectionId: line.rentalSelectionId,
      })),
      fulfilledAssets: rental.currentAssignedAssets.map((assignment) => ({
        id: assignment.id,
        rentalDemandLineId: assignment.rentalDemandLineId,
        assetId: assignment.assetId,
        ownershipSnapshot: assignment.ownershipSnapshot.toJSON(),
      })),
      priceLines: snapshot.lines.map((line) => ({
        rentalSelectionId: line.rentalSelectionId,
        netAmount: line.total,
      })),
    }).splits;
  }

  private error(
    code: RestoreConfirmedPackageDemandLineError['code'],
    message: string,
    context: Record<string, unknown>,
    cause?: unknown,
  ) {
    return restoreConfirmedPackageDemandLineError(code, message, cause, context);
  }

  private map(error: unknown, context: Record<string, unknown>): RestoreConfirmedPackageDemandLineError {
    if (error instanceof RentalDemandLineNotFoundError) {
      return this.error('rental_commitment.rental_demand_line_not_found', error.message, context, error);
    }
    if (error instanceof RentalCannotBeEditedFromStatusError) {
      return this.error('rental_commitment.rental_cannot_be_edited_from_status', error.message, context, error);
    }
    if (error instanceof RentalPeriodHasEndedError) {
      return this.error('rental_commitment.rental_period_ended', error.message, context, error);
    }
    if (error instanceof InsufficientAssetAvailabilityError) {
      return this.error('rental_commitment.insufficient_asset_availability', error.message, context, error);
    }
    if (error instanceof RentalInvalidFieldError || error instanceof RentalSelectionNotFoundError) {
      return this.error('rental_commitment.invalid_rental_field', error.message, context, error);
    }
    throw error;
  }
}
