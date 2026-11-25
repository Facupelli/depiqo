import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TenantPermission } from '@repo/api-contracts';
import { err, ok, Result } from 'neverthrow';
import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { PostgresExclusionViolationError } from 'src/core/utils/postgres-error.mapper';
import { TenantAuthorization } from 'src/modules/tenant-management/authorization/tenant-authorization.public-api';
import { ConfirmedRentalDeliveryPreparationService } from '../../application/confirmed-rental-delivery-preparation.service';
import { toRentalIntegrationEvents } from '../../application/rental-integration-event.mapper';
import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import type { AssetId } from '../../domain/types/rental-commitment-ids';
import type { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { RentalPersistenceStateMismatchError, RentalRepository } from '../../persistence/rental.repository';
import { ChangeConfirmedRentalDeliveryCommand } from './change-confirmed-rental-delivery.command';
import {
  ChangeConfirmedRentalDeliveryError,
  changeConfirmedRentalDeliveryError,
  mapChangeConfirmedRentalDeliveryError,
} from './change-confirmed-rental-delivery.errors';

export type ChangeConfirmedRentalDeliveryResult = Result<
  { rentalId: string; version: number; updatedAt: Date },
  ChangeConfirmedRentalDeliveryError
>;

@CommandHandler(ChangeConfirmedRentalDeliveryCommand)
export class ChangeConfirmedRentalDeliveryHandler implements ICommandHandler<
  ChangeConfirmedRentalDeliveryCommand,
  ChangeConfirmedRentalDeliveryResult
> {
  constructor(
    private readonly rentals: RentalRepository,
    private readonly preparation: ConfirmedRentalDeliveryPreparationService,
    private readonly allocation: RentalAssetAllocationService,
    private readonly unitOfWork: PrismaUnitOfWork,
    private readonly authorization: TenantAuthorization,
  ) {}

  async execute(command: ChangeConfirmedRentalDeliveryCommand): Promise<ChangeConfirmedRentalDeliveryResult> {
    const { tenantId, tenantUserId, rentalId, expectedVersion, destination, deliveryDecisions } = command.props;
    const context = { useCase: 'ChangeConfirmedRentalDelivery', tenantId, tenantUserId, rentalId };
    const failure = (code: ChangeConfirmedRentalDeliveryError['code'], message: string, cause?: unknown) =>
      err(changeConfirmedRentalDeliveryError(code, message, cause, context));
    const conflict = (cause?: unknown) =>
      failure('rental_commitment.rental_version_conflict', 'The rental was modified.', cause);
    const unavailable = (cause?: unknown) =>
      failure(
        'rental_commitment.assigned_assets_unavailable',
        'Assigned assets conflict with the proposed delivery reservations.',
        cause,
      );
    const allowed = await this.authorization.hasPermission(
      { tenantId, tenantUserId },
      TenantPermission.RentalsDeliveryManage,
    );
    if (allowed.isErr() && allowed.error.code === 'TenantAuthorizationStateInvalid') throw allowed.error;
    if (allowed.isErr() || !allowed.value)
      return failure(
        'rental_commitment.delivery_management_permission_denied',
        'Delivery-management permission is required.',
        allowed.isErr() ? allowed.error : undefined,
      );

    const initial = await this.rentals.findById(tenantId, rentalId);
    if (!initial) return failure('rental_commitment.rental_not_found', 'Rental not found.');
    if (initial.version !== expectedVersion) return conflict();
    const prepared = await this.preparation.prepare({
      rental: initial,
      tenantUserId,
      destination,
      decisions: deliveryDecisions ?? {},
    });
    if (prepared.isErr()) return err({ ...prepared.error, context: { ...prepared.error.context, ...context } });

    try {
      return await this.unitOfWork.runResultInTransaction(async ({ tx, integrationEvents }) => {
        const rental = await this.rentals.findById(tenantId, rentalId, tx);
        if (!rental) return failure('rental_commitment.rental_not_found', 'Rental not found.');
        if (rental.version !== expectedVersion) return conflict();
        const previousPeriods = new Map(rental.assetBlocks.map((block) => [block.id, block.period]));
        const changed = rental.changeConfirmedDelivery({ ...prepared.value, operationTime: new Date() });
        if (changed.isErr()) return err(mapChangeConfirmedRentalDeliveryError(changed.error, context));
        if (changed.value === 'UNCHANGED')
          return ok({ rentalId, version: rental.version, updatedAt: rental.updatedAt! });
        const changedBlocks = rental.currentOperationalAssetBlocks.filter(
          (block) => !previousPeriods.get(block.id)?.equals(block.period),
        );
        const reservationGroups = new Map<string, { period: RentalPeriod; assetIds: AssetId[] }>();
        for (const block of changedBlocks) {
          const key = block.period.toPostgresRange();
          const group = reservationGroups.get(key) ?? { period: block.period, assetIds: [] };
          group.assetIds.push(block.assetId);
          reservationGroups.set(key, group);
        }
        for (const group of reservationGroups.values()) {
          const conflicts = await this.allocation.findConflictingExactAssetIds({
            tenantId,
            currentRentalId: rentalId,
            assetIds: group.assetIds,
            periodStart: group.period.start,
            periodEnd: group.period.end,
            tx,
          });
          if (conflicts.length) return unavailable();
        }
        const saved = await this.rentals.changeConfirmedDelivery(rental, {
          expectedVersion,
          changedBlockIds: changedBlocks.map((block) => block.id),
          tx,
        });
        if (!saved) {
          if (new Date() >= rental.period.start)
            return failure('rental_commitment.rental_period_started', 'The scheduled rental start has been reached.');
          return conflict();
        }
        integrationEvents.collect(toRentalIntegrationEvents(rental.pullDomainEvents()));
        return ok({ rentalId, version: saved.version, updatedAt: saved.updatedAt });
      });
    } catch (error) {
      if (error instanceof PostgresExclusionViolationError) return unavailable(error);
      if (error instanceof RentalPersistenceStateMismatchError) return conflict(error);
      throw error;
    }
  }
}
