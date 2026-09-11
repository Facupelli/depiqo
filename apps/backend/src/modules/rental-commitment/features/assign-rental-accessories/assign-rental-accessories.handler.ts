import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { PostgresExclusionViolationError } from 'src/core/utils/postgres-error.mapper';
import { V2RentalStatus } from 'src/generated/prisma/enums';
import { AssetInventoryDisplayFacts } from 'src/modules/asset-inventory/public-api/asset-inventory-display-facts.public-api';

import {
  AccessoryReconciliationAvailabilityError,
  AccessorySelectionForReconciliation,
  AccessorySelectionReconciliationService,
  accessorySelectionKey,
} from '../../application/accessory-selection-reconciliation.service';
import { resolveEquipmentTypeNames } from '../../application/equipment-type-display-facts';
import { deriveConfirmedAssetBlockPeriod } from '../../domain/confirmed-asset-block-period';
import { RentalInvalidFieldError } from '../../domain/errors/rental-commitment.errors';
import { AcceptedDeliverySnapshot } from '../../domain/value-objects/accepted-delivery-snapshot.value-object';
import { JsonValue } from '../../domain/value-objects/json-snapshot.value-object';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { ConfirmedRentalEditedIntegrationEvent } from '../../public-api/events/rental-lifecycle.integration-events';
import { AssignRentalAccessoriesCommand } from './assign-rental-accessories.command';
import { assignRentalAccessoriesError, AssignRentalAccessoriesError } from './assign-rental-accessories.errors';

export type AssignRentalAccessoriesResult = Result<void, AssignRentalAccessoriesError>;

type RentalReadModel = {
  id: string;
  tenantId: string;
  branchId: string;
  status: V2RentalStatus;
  customerId: string | null;
  fulfillmentMethod: 'PICKUP' | 'DELIVERY';
  periodStart: Date;
  periodEnd: Date;
  version: number;
  acceptedBeforeBufferMinutes: number | null;
  acceptedAfterBufferMinutes: number | null;
  deliverySnapshot: unknown | null;
};

@CommandHandler(AssignRentalAccessoriesCommand)
export class AssignRentalAccessoriesHandler implements ICommandHandler<
  AssignRentalAccessoriesCommand,
  AssignRentalAccessoriesResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitOfWork: PrismaUnitOfWork,
    private readonly reconciliation: AccessorySelectionReconciliationService,
    private readonly assetInventoryDisplayFacts: AssetInventoryDisplayFacts,
  ) {}

  async execute(command: AssignRentalAccessoriesCommand): Promise<AssignRentalAccessoriesResult> {
    const context = { useCase: 'AssignRentalAccessories', tenantId: command.tenantId, rentalId: command.rentalId };
    const rental = await this.prisma.client.v2Rental.findFirst({
      where: { id: command.rentalId, tenantId: command.tenantId },
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
        assignRentalAccessoriesError(
          'rental_commitment.rental_not_found',
          `Rental "${command.rentalId}" was not found.`,
          undefined,
          context,
        ),
      );
    if (rental.status !== V2RentalStatus.CONFIRMED)
      return err(
        assignRentalAccessoriesError(
          'rental_commitment.rental_status_does_not_allow_accessory_assignment',
          `Rental status "${rental.status}" does not allow accessory assignment.`,
          undefined,
          { ...context, rentalStatus: rental.status },
        ),
      );

    const operationTime = new Date();
    const participationStart = operationTime < rental.periodStart ? rental.periodStart : operationTime;
    if (participationStart >= rental.periodEnd)
      return err(
        assignRentalAccessoriesError(
          'rental_commitment.rental_status_does_not_allow_accessory_assignment',
          'Accessories cannot be assigned after the rental period has ended.',
          undefined,
          context,
        ),
      );
    const buffer = this.resolveAcceptedAssetBuffer(rental);
    const operationalPeriod = deriveConfirmedAssetBlockPeriod({
      participationPeriod: new RentalPeriod(participationStart, rental.periodEnd),
      acceptedBeforeBufferMinutes: buffer.beforeBufferMinutes,
      acceptedAfterBufferMinutes: buffer.afterBufferMinutes,
      acceptedDelivery: this.resolveAcceptedDelivery(rental.deliverySnapshot),
      ...(operationTime >= rental.periodStart ? { clampStartAt: operationTime } : {}),
    });

    const validation = await this.validateInput(command, context);
    if (validation.isErr()) return err(validation.error);
    const currentSelections = await this.loadSelections(command.tenantId, command.rentalId);
    const currentByKey = new Map(currentSelections.map((selection) => [accessorySelectionKey(selection), selection]));
    const newTypeIds = command.accessories
      .filter((item) => !currentByKey.has(accessorySelectionKey(item)))
      .map(({ equipmentTypeId }) => equipmentTypeId);
    const names = await resolveEquipmentTypeNames(this.assetInventoryDisplayFacts, {
      tenantId: command.tenantId,
      equipmentTypeIds: newTypeIds,
    });
    if (names.isErr())
      return err(
        assignRentalAccessoriesError('rental_commitment.equipment_type_not_found', names.error.message, names.error, {
          ...context,
          equipmentTypeId: names.error.equipmentTypeId,
        }),
      );

    const plan = await this.reconciliation.plan({
      tenantId: command.tenantId,
      rentalId: command.rentalId,
      branchId: rental.branchId,
      operationalPeriod,
      currentSelections,
      desiredSelections: command.accessories.map((item) => ({
        ...item,
        equipmentTypeNameSnapshot:
          currentByKey.get(accessorySelectionKey(item))?.equipmentTypeNameSnapshot ??
          names.value.get(item.equipmentTypeId),
      })),
    });
    if (plan.isErr()) return this.mapAllocationError(plan.error, context);
    const changed = this.reconciliation.changed(currentSelections, plan.value);

    let persisted: boolean;
    try {
      persisted = await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
        const didPersist = await this.reconciliation.persist({
          tenantId: command.tenantId,
          rentalId: command.rentalId,
          expectedVersion: rental.version,
          currentSelections,
          plannedSelections: plan.value,
          operationalPeriod,
          operationTime,
          tx,
        });
        if (didPersist && changed && rental.customerId)
          integrationEvents.collect([
            new ConfirmedRentalEditedIntegrationEvent(
              rental.tenantId,
              rental.id,
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
          assignRentalAccessoriesError(
            'rental_commitment.asset_availability_changed',
            'Accessory availability changed while the assignment was being saved.',
            error,
            context,
          ),
        );
      throw error;
    }
    if (!persisted)
      return err(
        assignRentalAccessoriesError(
          'rental_commitment.rental_version_conflict',
          `Rental "${command.rentalId}" was modified by another request.`,
          undefined,
          context,
        ),
      );
    return ok(undefined);
  }

  private async loadSelections(tenantId: string, rentalId: string): Promise<AccessorySelectionForReconciliation[]> {
    return this.prisma.client.v2RentalAccessorySelection.findMany({
      where: { tenantId, rentalOrderId: rentalId },
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
  }

  private mapAllocationError(error: unknown, context: Record<string, unknown>): AssignRentalAccessoriesResult {
    if (!(error instanceof AccessoryReconciliationAvailabilityError)) throw error;
    return err(
      assignRentalAccessoriesError('rental_commitment.insufficient_asset_availability', error.message, error.cause, {
        ...context,
        availability: {
          sourceRentalDemandLineId: error.selection.sourceRentalDemandLineId ?? null,
          equipmentTypeId: error.selection.equipmentTypeId,
          requestedQuantity: error.selection.quantity,
          availableQuantity: error.selection.keptAssetIds.length + error.cause.availableQuantity,
        },
      }),
    );
  }

  private async validateInput(
    command: AssignRentalAccessoriesCommand,
    context: Record<string, unknown>,
  ): Promise<AssignRentalAccessoriesResult> {
    const demandLineIds = new Set<string>();
    const keys = new Set<string>();
    for (const [index, item] of command.accessories.entries()) {
      if (item.quantity <= 0)
        return err(
          assignRentalAccessoriesError(
            'rental_commitment.invalid_accessory_quantity',
            `accessories.${index}.quantity must be a positive integer.`,
            undefined,
            { ...context, accessoryIndex: index },
          ),
        );
      const key = accessorySelectionKey(item);
      if (keys.has(key))
        return err(
          assignRentalAccessoriesError(
            'rental_commitment.duplicate_accessory_selection',
            `accessories.${index} duplicates another accessory selection.`,
            undefined,
            { ...context, accessoryIndex: index },
          ),
        );
      keys.add(key);
      if (item.sourceRentalDemandLineId) demandLineIds.add(item.sourceRentalDemandLineId);
    }
    if (demandLineIds.size > 0) {
      const count = await this.prisma.client.v2RentalDemandLine.count({
        where: {
          tenantId: command.tenantId,
          rentalId: command.rentalId,
          id: { in: [...demandLineIds] },
          removedAt: null,
        },
      });
      if (count !== demandLineIds.size)
        return err(
          assignRentalAccessoriesError(
            'rental_commitment.source_rental_demand_line_not_found',
            'One or more source rental demand lines do not belong to this rental.',
            undefined,
            context,
          ),
        );
    }
    return ok(undefined);
  }

  private resolveAcceptedDelivery(snapshot: unknown | null): AcceptedDeliverySnapshot | undefined {
    if (snapshot === null) return undefined;
    const result = AcceptedDeliverySnapshot.create(snapshot as JsonValue);
    if (result.isErr()) throw result.error;
    return result.value;
  }
  private resolveAcceptedAssetBuffer(rental: RentalReadModel): {
    beforeBufferMinutes: number;
    afterBufferMinutes: number;
  } {
    if (rental.acceptedBeforeBufferMinutes === null || rental.acceptedAfterBufferMinutes === null)
      throw new RentalInvalidFieldError('acceptedAssetBuffer', 'persisted buffer values must both be present');
    return {
      beforeBufferMinutes: rental.acceptedBeforeBufferMinutes,
      afterBufferMinutes: rental.acceptedAfterBufferMinutes,
    };
  }
}
