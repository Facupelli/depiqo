import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';

import { toRentalIntegrationEvents } from '../../application/rental-integration-event.mapper';
import {
  RentalCannotBeEditedFromStatusError,
  RentalDemandLineNotFoundError,
  RentalInvalidFieldError,
  RentalPeriodHasEndedError,
  RentalSelectionNotFoundError,
} from '../../domain/errors/rental-commitment.errors';
import { Rental } from '../../domain/rental.aggregate';
import { RentableItemKind } from '../../domain/rental-status';
import { getConfirmedPriceSnapshotForOwnerSplits } from '../../owner-split/confirmed-price-snapshot-for-owner-splits';
import { RentalOwnerSplitDraft } from '../../owner-split/owner-split-calculator.types';
import { RentalOwnerSplitCalculator } from '../../owner-split/rental-owner-split-calculator';
import { RentalRepository } from '../../persistence/rental.repository';
import { RemoveConfirmedPackageDemandLineCommand } from './remove-confirmed-package-demand-line.command';
import {
  RemoveConfirmedPackageDemandLineError,
  removeConfirmedPackageDemandLineError,
} from './remove-confirmed-package-demand-line.errors';

export type RemoveConfirmedPackageDemandLineResult = Result<
  { rentalId: string; version: number; updatedAt: Date },
  RemoveConfirmedPackageDemandLineError
>;

@CommandHandler(RemoveConfirmedPackageDemandLineCommand)
export class RemoveConfirmedPackageDemandLineHandler implements ICommandHandler<
  RemoveConfirmedPackageDemandLineCommand,
  RemoveConfirmedPackageDemandLineResult
> {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly splitCalculator: RentalOwnerSplitCalculator,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: RemoveConfirmedPackageDemandLineCommand): Promise<RemoveConfirmedPackageDemandLineResult> {
    const { tenantId, tenantUserId, rentalId, demandLineId, expectedVersion, quantity, releaseAssetIds } =
      command.props;
    const context = {
      useCase: 'RemoveConfirmedPackageDemandLine',
      tenantId,
      tenantUserId,
      rentalId,
      demandLineId,
      quantity,
      releaseAssetIds,
    };

    return this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
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

      const demandLine = rental.currentDemandLines.find((candidate) => candidate.id === demandLineId);
      const parentSelection = demandLine
        ? rental.currentSelections.find((candidate) => candidate.id === demandLine.rentalSelectionId)
        : undefined;
      const isCurrentPackageDemandLine = parentSelection?.rentableItemKindSnapshot === RentableItemKind.Package;
      if (isCurrentPackageDemandLine && demandLine?.operationalQuantity === quantity) {
        const accessoryReference = await tx.v2RentalAccessorySelection.findFirst({
          where: {
            tenantId,
            rentalOrderId: rentalId,
            sourceRentalDemandLineId: demandLineId,
          },
          select: { id: true },
        });
        if (accessoryReference) {
          return err(
            this.error(
              'rental_commitment.rental_demand_line_referenced_by_accessory',
              `Rental demand line "${demandLineId}" is referenced by a current accessory selection.`,
              context,
            ),
          );
        }
      }

      const removed = rental.removeConfirmedPackageDemandLine({
        demandLineId,
        quantity,
        releaseAssetIds,
        operationTime: new Date(),
      });
      if (removed.isErr()) return err(this.map(removed.error, context));

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
    code: RemoveConfirmedPackageDemandLineError['code'],
    message: string,
    context: Record<string, unknown>,
    cause?: unknown,
  ) {
    return removeConfirmedPackageDemandLineError(code, message, cause, context);
  }

  private map(error: unknown, context: Record<string, unknown>): RemoveConfirmedPackageDemandLineError {
    if (error instanceof RentalDemandLineNotFoundError) {
      return this.error('rental_commitment.rental_demand_line_not_found', error.message, context, error);
    }
    if (error instanceof RentalCannotBeEditedFromStatusError) {
      return this.error('rental_commitment.rental_cannot_be_edited_from_status', error.message, context, error);
    }
    if (error instanceof RentalPeriodHasEndedError) {
      return this.error('rental_commitment.rental_period_ended', error.message, context, error);
    }
    if (error instanceof RentalInvalidFieldError || error instanceof RentalSelectionNotFoundError) {
      return this.error('rental_commitment.invalid_rental_field', error.message, context, error);
    }
    throw error;
  }
}
