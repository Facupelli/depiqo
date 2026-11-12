import type { ApplicationErrorContext } from 'src/core/errors/application-error';

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';
import { TenantPermission } from '@repo/api-contracts';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { TenantAuthorization } from 'src/modules/tenant-management/authorization/tenant-authorization.public-api';
import { PostgresExclusionViolationError } from 'src/core/utils/postgres-error.mapper';

import { ConfirmedRentalReschedulingPreparationService } from '../../application/confirmed-rental-rescheduling-preparation.service';
import { toRentalIntegrationEvents } from '../../application/rental-integration-event.mapper';
import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';

import { AssetId } from '../../domain/types/rental-commitment-ids';
import { RentalPersistenceStateMismatchError, RentalRepository } from '../../persistence/rental.repository';
import { RescheduleConfirmedRentalPeriodCommand } from './reschedule-confirmed-rental-period.command';
import {
  RescheduleConfirmedRentalPeriodError,
  rescheduleConfirmedRentalPeriodError,
  mapRescheduleConfirmedRentalPeriodError,
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
    private readonly preparation: ConfirmedRentalReschedulingPreparationService,
    private readonly authorization: TenantAuthorization,
  ) {}

  async execute(command: RescheduleConfirmedRentalPeriodCommand): Promise<RescheduleConfirmedRentalPeriodResult> {
    const { tenantId, tenantUserId, rentalId, expectedVersion, periodStart, periodEnd } = command.props;
    const context = { useCase: 'RescheduleConfirmedRentalPeriod', tenantId, tenantUserId, rentalId };

    const initial = await this.rentals.findById(tenantId, rentalId);
    if (!initial) return err(this.notFound(rentalId, context));
    if (initial.version !== expectedVersion) return err(this.versionConflict(rentalId, context));
    // Routing and delivery configuration reads are deliberately outside the write transaction.
    const prepared = await this.preparation.prepare({ rental: initial, expectedVersion, periodStart, periodEnd });
    if (prepared.isErr()) return err({ ...prepared.error, context: { ...prepared.error.context, ...context } });
    const acceptedDelivery = this.preparation.accept({
      prepared: prepared.value,
      decisions: command.props.deliveryDecisions ?? {},
      tenantUserId,
      operationTime: new Date(),
    });
    if (acceptedDelivery.isErr())
      return err({ ...acceptedDelivery.error, context: { ...acceptedDelivery.error.context, ...context } });
    if (acceptedDelivery.value?.snapshot.policyException) {
      const allowed = await this.authorization.hasPermission(
        { tenantId, tenantUserId },
        TenantPermission.RentalsDeliveryManage,
      );
      if (allowed.isErr() && allowed.error.code === 'TenantAuthorizationStateInvalid') throw allowed.error;
      if (allowed.isErr() || !allowed.value) {
        return err(
          this.error(
            'rental_commitment.delivery_exception_permission_denied',
            'Delivery-management permission is required to authorize an exception.',
            context,
          ),
        );
      }
    }

    try {
      return await this.unitOfWork.runResultInTransaction(async ({ tx, integrationEvents }) => {
        const rental = await this.rentals.findById(tenantId, rentalId, tx);
        if (!rental) return err(this.notFound(rentalId, context));
        if (rental.version !== expectedVersion) return err(this.versionConflict(rentalId, context));

        const operationTime = new Date();
        const rescheduled = rental.rescheduleConfirmedPeriod({
          period: prepared.value.period,
          operationTime,
          acceptedDelivery: acceptedDelivery.value,
        });
        if (rescheduled.isErr()) return err(mapRescheduleConfirmedRentalPeriodError(rescheduled.error, context));

        const currentOperationalBlocks = rental.currentOperationalAssetBlocks;
        const blockPeriod = currentOperationalBlocks[0]?.period;
        if (!blockPeriod) {
          throw new Error(`Confirmed rental "${rentalId}" has no current operational asset blocks.`);
        }
        if (currentOperationalBlocks.some((block) => !block.period.equals(blockPeriod))) {
          throw new Error(`Confirmed rental "${rentalId}" has inconsistent current operational block periods.`);
        }

        // SAFETY: This value comes from a persisted or already validated non-empty domain identifier; the brand adds no runtime representation.
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

  private notFound(rentalId: string, context: ApplicationErrorContext) {
    return this.error('rental_commitment.rental_not_found', `Rental "${rentalId}" was not found.`, context);
  }

  private versionConflict(rentalId: string, context: ApplicationErrorContext, cause?: unknown) {
    return this.error(
      'rental_commitment.rental_version_conflict',
      `Rental "${rentalId}" was modified by another request.`,
      context,
      cause,
    );
  }

  private assetsUnavailable(context: ApplicationErrorContext, cause?: unknown) {
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
    context: ApplicationErrorContext,
    cause?: unknown,
  ) {
    return rescheduleConfirmedRentalPeriodError(code, message, cause, context);
  }
}
