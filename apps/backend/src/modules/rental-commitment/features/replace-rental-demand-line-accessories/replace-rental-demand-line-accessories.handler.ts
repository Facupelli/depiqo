import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { PostgresExclusionViolationError } from 'src/core/utils/postgres-error.mapper';
import { V2RentalStatus } from 'src/generated/prisma/enums';
import { AssetInventoryDisplayFacts } from 'src/modules/asset-inventory/public-api/asset-inventory-display-facts.public-api';

import {
  AccessoryReconciliationAvailabilityError,
  AccessorySelectionReconciliationService,
} from '../../application/accessory-selection-reconciliation.service';
import { resolveEquipmentTypeNames } from '../../application/equipment-type-display-facts';
import { deriveConfirmedAssetBlockPeriod } from '../../domain/confirmed-asset-block-period';
import { RentalInvalidFieldError } from '../../domain/errors/rental-commitment.errors';
import { AcceptedDeliverySnapshot } from '../../domain/value-objects/accepted-delivery-snapshot.value-object';
import { JsonValue } from '../../domain/value-objects/json-snapshot.value-object';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { ConfirmedRentalEditedIntegrationEvent } from '../../public-api/events/rental-lifecycle.integration-events';
import { ReplaceRentalDemandLineAccessoriesCommand } from './replace-rental-demand-line-accessories.command';
import {
  ReplaceRentalDemandLineAccessoriesError,
  replaceRentalDemandLineAccessoriesError,
} from './replace-rental-demand-line-accessories.errors';

export type ReplaceRentalDemandLineAccessoriesResult = Result<void, ReplaceRentalDemandLineAccessoriesError>;

@CommandHandler(ReplaceRentalDemandLineAccessoriesCommand)
export class ReplaceRentalDemandLineAccessoriesHandler implements ICommandHandler<
  ReplaceRentalDemandLineAccessoriesCommand,
  ReplaceRentalDemandLineAccessoriesResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitOfWork: PrismaUnitOfWork,
    private readonly reconciliation: AccessorySelectionReconciliationService,
    private readonly displayFacts: AssetInventoryDisplayFacts,
  ) {}

  async execute(command: ReplaceRentalDemandLineAccessoriesCommand): Promise<ReplaceRentalDemandLineAccessoriesResult> {
    const { tenantId, rentalId, rentalDemandLineId, expectedVersion, accessories } = command.props;
    const context = { useCase: 'ReplaceRentalDemandLineAccessories', tenantId, rentalId, rentalDemandLineId };
    const rental = await this.prisma.client.v2Rental.findFirst({
      where: { id: rentalId, tenantId },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        status: true,
        customerId: true,
        fulfillmentMethod: true,
        periodStart: true,
        periodEnd: true,
        version: true,
        acceptedBeforeBufferMinutes: true,
        acceptedAfterBufferMinutes: true,
        deliverySnapshot: true,
      },
    });
    if (!rental)
      return err(
        replaceRentalDemandLineAccessoriesError(
          'rental_commitment.rental_not_found',
          `Rental "${rentalId}" was not found.`,
          undefined,
          context,
        ),
      );
    if (rental.version !== expectedVersion) return err(this.versionConflict(rentalId, context));
    if (rental.status !== V2RentalStatus.CONFIRMED)
      return err(
        replaceRentalDemandLineAccessoriesError(
          'rental_commitment.rental_status_does_not_allow_accessory_assignment',
          `Rental status "${rental.status}" does not allow accessory assignment.`,
          undefined,
          { ...context, rentalStatus: rental.status },
        ),
      );

    const demandLine = await this.prisma.client.v2RentalDemandLine.findFirst({
      where: { id: rentalDemandLineId, rentalId, tenantId, removedAt: null },
      select: { id: true },
    });
    if (!demandLine)
      return err(
        replaceRentalDemandLineAccessoriesError(
          'rental_commitment.source_rental_demand_line_not_found',
          'The rental demand line does not belong to this rental.',
          undefined,
          context,
        ),
      );

    const seen = new Set<string>();
    for (const [index, accessory] of accessories.entries()) {
      if (accessory.quantity <= 0)
        return err(
          replaceRentalDemandLineAccessoriesError(
            'rental_commitment.invalid_accessory_quantity',
            `accessories.${index}.quantity must be a positive integer.`,
            undefined,
            { ...context, accessoryIndex: index },
          ),
        );
      if (seen.has(accessory.equipmentTypeId))
        return err(
          replaceRentalDemandLineAccessoriesError(
            'rental_commitment.duplicate_accessory_selection',
            `accessories.${index} duplicates another accessory selection.`,
            undefined,
            { ...context, accessoryIndex: index },
          ),
        );
      seen.add(accessory.equipmentTypeId);
    }
    const names = await resolveEquipmentTypeNames(this.displayFacts, {
      tenantId,
      equipmentTypeIds: accessories.map(({ equipmentTypeId }) => equipmentTypeId),
    });
    if (names.isErr())
      return err(
        replaceRentalDemandLineAccessoriesError(
          'rental_commitment.equipment_type_not_found',
          names.error.message,
          names.error,
          { ...context, equipmentTypeId: names.error.equipmentTypeId },
        ),
      );

    const operationTime = new Date();
    const participationStart = operationTime < rental.periodStart ? rental.periodStart : operationTime;
    if (participationStart >= rental.periodEnd)
      return err(
        replaceRentalDemandLineAccessoriesError(
          'rental_commitment.rental_status_does_not_allow_accessory_assignment',
          'Accessories cannot be assigned after the rental period has ended.',
          undefined,
          context,
        ),
      );
    if (rental.acceptedBeforeBufferMinutes === null || rental.acceptedAfterBufferMinutes === null)
      throw new RentalInvalidFieldError('acceptedAssetBuffer', 'persisted buffer values must both be present');
    let acceptedDelivery: AcceptedDeliverySnapshot | undefined;
    if (rental.deliverySnapshot !== null) {
      const parsed = AcceptedDeliverySnapshot.create(rental.deliverySnapshot as JsonValue);
      if (parsed.isErr()) throw parsed.error;
      acceptedDelivery = parsed.value;
    }
    const operationalPeriod = deriveConfirmedAssetBlockPeriod({
      participationPeriod: new RentalPeriod(participationStart, rental.periodEnd),
      acceptedBeforeBufferMinutes: rental.acceptedBeforeBufferMinutes,
      acceptedAfterBufferMinutes: rental.acceptedAfterBufferMinutes,
      acceptedDelivery,
      ...(operationTime >= rental.periodStart ? { clampStartAt: operationTime } : {}),
    });

    const currentSelections = await this.prisma.client.v2RentalAccessorySelection.findMany({
      where: { tenantId, rentalOrderId: rentalId, sourceRentalDemandLineId: rentalDemandLineId },
      select: {
        id: true,
        sourceRentalDemandLineId: true,
        equipmentTypeId: true,
        equipmentTypeNameSnapshot: true,
        quantity: true,
        assignments: { select: { id: true, assetId: true }, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const protectedRows = await this.prisma.client.v2RentalAccessoryAssetAssignment.findMany({
      where: {
        tenantId,
        rentalOrderId: rentalId,
        rentalAccessorySelection: {
          OR: [{ sourceRentalDemandLineId: null }, { sourceRentalDemandLineId: { not: rentalDemandLineId } }],
        },
      },
      select: { assetId: true },
    });
    const plan = await this.reconciliation.plan({
      tenantId,
      rentalId,
      branchId: rental.branchId,
      operationalPeriod,
      currentSelections,
      protectedAssetIds: protectedRows.map(({ assetId }) => assetId),
      desiredSelections: accessories.map((item) => ({
        ...item,
        sourceRentalDemandLineId: rentalDemandLineId,
        equipmentTypeNameSnapshot: names.value.get(item.equipmentTypeId),
      })),
    });
    if (plan.isErr()) {
      if (!(plan.error instanceof AccessoryReconciliationAvailabilityError)) throw plan.error;
      const availabilityError = plan.error;
      return err(
        replaceRentalDemandLineAccessoriesError(
          'rental_commitment.insufficient_asset_availability',
          availabilityError.message,
          availabilityError.cause,
          {
            ...context,
            availability: {
              sourceRentalDemandLineId: rentalDemandLineId,
              equipmentTypeId: availabilityError.selection.equipmentTypeId,
              requestedQuantity: availabilityError.selection.quantity,
              availableQuantity:
                availabilityError.selection.keptAssetIds.length + availabilityError.cause.availableQuantity,
            },
          },
        ),
      );
    }
    const changed = this.reconciliation.changed(currentSelections, plan.value);

    let persisted: boolean;
    try {
      persisted = await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
        const didPersist = await this.reconciliation.persist({
          tenantId,
          rentalId,
          expectedVersion,
          currentSelections,
          plannedSelections: plan.value,
          operationalPeriod,
          operationTime,
          tx,
        });
        if (didPersist && changed && rental.customerId)
          integrationEvents.collect([
            new ConfirmedRentalEditedIntegrationEvent(
              tenantId,
              rentalId,
              rental.customerId,
              rental.branchId,
              'CONFIRMED',
              rental.fulfillmentMethod,
              rental.periodStart,
              rental.periodEnd,
            ),
          ]);
        return didPersist;
      });
    } catch (error) {
      if (error instanceof PostgresExclusionViolationError)
        return err(
          replaceRentalDemandLineAccessoriesError(
            'rental_commitment.asset_availability_changed',
            'Accessory availability changed while the assignment was being saved.',
            error,
            context,
          ),
        );
      throw error;
    }
    return persisted ? ok(undefined) : err(this.versionConflict(rentalId, context));
  }

  private versionConflict(rentalId: string, context: Record<string, unknown>): ReplaceRentalDemandLineAccessoriesError {
    return replaceRentalDemandLineAccessoriesError(
      'rental_commitment.rental_version_conflict',
      `Rental "${rentalId}" was modified by another request.`,
      undefined,
      context,
    );
  }
}
