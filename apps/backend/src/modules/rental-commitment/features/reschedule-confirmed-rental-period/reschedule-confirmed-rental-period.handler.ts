import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { DomainException } from 'src/core/exceptions/domain.exception';
import { PostgresExclusionViolationError } from 'src/core/utils/postgres-error.mapper';

import { toRentalIntegrationEvents } from '../../application/rental-integration-event.mapper';
import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import {
  RentalCannotBeEditedFromStatusError,
  RentalPeriodCannotStartInPastError,
  RentalPeriodHasStartedError,
} from '../../domain/errors/rental-commitment.errors';
import { RentalStatus } from '../../domain/rental-status';
import { AssetId } from '../../domain/types/rental-commitment-ids';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { RentalPersistenceStateMismatchError, RentalRepository } from '../../persistence/rental.repository';
import { RescheduleConfirmedRentalPeriodCommand } from './reschedule-confirmed-rental-period.command';
import {
  RescheduleConfirmedRentalPeriodError,
  rescheduleConfirmedRentalPeriodError,
} from './reschedule-confirmed-rental-period.errors';

export type RescheduleConfirmedRentalPeriodResult = Result<
  { rentalId: string; version: number; updatedAt: Date },
  RescheduleConfirmedRentalPeriodError
>;

@CommandHandler(RescheduleConfirmedRentalPeriodCommand)
export class RescheduleConfirmedRentalPeriodHandler implements ICommandHandler<
  RescheduleConfirmedRentalPeriodCommand,
  RescheduleConfirmedRentalPeriodResult
> {
  constructor(
    private readonly rentals: RentalRepository,
    private readonly allocation: RentalAssetAllocationService,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: RescheduleConfirmedRentalPeriodCommand): Promise<RescheduleConfirmedRentalPeriodResult> {
    const { tenantId, tenantUserId, rentalId, expectedVersion, periodStart, periodEnd } = command.props;
    const context = { useCase: 'RescheduleConfirmedRentalPeriod', tenantId, tenantUserId, rentalId };

    const initial = await this.rentals.findById(tenantId, rentalId);
    if (!initial) return err(this.notFound(rentalId, context));
    if (initial.version !== expectedVersion) return err(this.versionConflict(rentalId, context));
    if (initial.status !== RentalStatus.Confirmed) {
      return err(this.map(new RentalCannotBeEditedFromStatusError(rentalId, initial.status), context));
    }

    try {
      return await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
        const rental = await this.rentals.findById(tenantId, rentalId, tx);
        if (!rental) return err(this.notFound(rentalId, context));
        if (rental.version !== expectedVersion) return err(this.versionConflict(rentalId, context));

        let proposedPeriod: RentalPeriod;
        try {
          proposedPeriod = new RentalPeriod(periodStart, periodEnd);
        } catch (error) {
          if (error instanceof DomainException) {
            return err(this.error('rental_commitment.invalid_rental_period', error.message, context, error));
          }
          throw error;
        }

        const operationTime = new Date();
        const rescheduled = rental.rescheduleConfirmedPeriod({ period: proposedPeriod, operationTime });
        if (rescheduled.isErr()) return err(this.map(rescheduled.error, context));

        const currentOperationalBlocks = rental.currentOperationalAssetBlocks;
        const blockPeriod = currentOperationalBlocks[0]?.period;
        if (!blockPeriod) {
          throw new Error(`Confirmed rental "${rentalId}" has no current operational asset blocks.`);
        }
        if (currentOperationalBlocks.some((block) => !block.period.equals(blockPeriod))) {
          throw new Error(`Confirmed rental "${rentalId}" has inconsistent current operational block periods.`);
        }

        const assetIds = [...new Set(currentOperationalBlocks.map((block) => block.assetId))] as AssetId[];
        const conflictingAssetIds = await this.allocation.findConflictingExactAssetIds({
          tenantId,
          currentRentalId: rentalId,
          assetIds,
          periodStart: blockPeriod.start,
          periodEnd: blockPeriod.end,
          tx,
        });
        if (conflictingAssetIds.length > 0) return err(this.assetsUnavailable(context));

        const saved = await this.rentals.rescheduleConfirmedPeriod(rental, { expectedVersion, tx });
        if (!saved) return err(this.versionConflict(rentalId, context));

        integrationEvents.collect(toRentalIntegrationEvents(rental.pullDomainEvents()));
        return ok({ rentalId, version: saved.version, updatedAt: saved.updatedAt });
      });
    } catch (error) {
      if (error instanceof PostgresExclusionViolationError) {
        return err(this.assetsUnavailable(context, error));
      }
      if (error instanceof RentalPersistenceStateMismatchError) {
        return err(this.versionConflict(rentalId, context, error));
      }
      throw error;
    }
  }

  private notFound(rentalId: string, context: Record<string, unknown>) {
    return this.error('rental_commitment.rental_not_found', `Rental "${rentalId}" was not found.`, context);
  }

  private versionConflict(rentalId: string, context: Record<string, unknown>, cause?: unknown) {
    return this.error(
      'rental_commitment.rental_version_conflict',
      `Rental "${rentalId}" was modified by another request.`,
      context,
      cause,
    );
  }

  private assetsUnavailable(context: Record<string, unknown>, cause?: unknown) {
    return this.error(
      'rental_commitment.assigned_assets_unavailable',
      'One or more currently assigned assets are unavailable for the proposed period.',
      context,
      cause,
    );
  }

  private error(
    code: RescheduleConfirmedRentalPeriodError['code'],
    message: string,
    context: Record<string, unknown>,
    cause?: unknown,
  ) {
    return rescheduleConfirmedRentalPeriodError(code, message, cause, context);
  }

  private map(error: unknown, context: Record<string, unknown>): RescheduleConfirmedRentalPeriodError {
    if (error instanceof RentalCannotBeEditedFromStatusError) {
      return this.error('rental_commitment.rental_cannot_be_edited_from_status', error.message, context, error);
    }
    if (error instanceof RentalPeriodHasStartedError) {
      return this.error('rental_commitment.rental_period_has_started', error.message, context, error);
    }
    if (error instanceof RentalPeriodCannotStartInPastError) {
      return this.error('rental_commitment.rental_period_must_start_in_future', error.message, context, error);
    }
    throw error;
  }
}
