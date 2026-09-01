import { randomUUID } from 'node:crypto';

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaTransactionClient, PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { mapPostgresError, PostgresExclusionViolationError } from 'src/core/utils/postgres-error.mapper';
import { AssetInventoryDisplayFacts } from 'src/modules/asset-inventory/public-api/asset-inventory-display-facts.public-api';
import { V2AssetBlockType, V2RentalStatus } from 'src/generated/prisma/enums';

import { resolveEquipmentTypeNames } from '../../application/equipment-type-display-facts';
import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import { deriveBufferedAssetBlockPeriod } from '../../domain/asset-block-period';
import {
  InsufficientAssetAvailabilityError,
  RentalInvalidFieldError,
} from '../../domain/errors/rental-commitment.errors';
import { RentalDemandLineId } from '../../domain/ids/rental-demand-line-id';
import { AssetId, EquipmentTypeId, RentalSelectionId } from '../../domain/types/rental-commitment-ids';
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
};

type ExistingSelection = {
  id: string;
  sourceRentalDemandLineId: string | null;
  equipmentTypeId: string;
  equipmentTypeNameSnapshot: string;
  quantity: number;
  assignments: Array<{ id: string; assetId: string }>;
};

type PlannedSelection = {
  id: string;
  sourceRentalDemandLineId?: string;
  equipmentTypeId: string;
  equipmentTypeNameSnapshot: string;
  quantity: number;
  keptAssignmentIds: string[];
  keptAssetIds: string[];
  newAssetIds: string[];
};

const ASSIGNABLE_RENTAL_STATUSES = new Set<V2RentalStatus>([V2RentalStatus.CONFIRMED]);

@CommandHandler(AssignRentalAccessoriesCommand)
export class AssignRentalAccessoriesHandler implements ICommandHandler<
  AssignRentalAccessoriesCommand,
  AssignRentalAccessoriesResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitOfWork: PrismaUnitOfWork,
    private readonly rentalAssetAllocation: RentalAssetAllocationService,
    private readonly assetInventoryDisplayFacts: AssetInventoryDisplayFacts,
  ) {}

  async execute(command: AssignRentalAccessoriesCommand): Promise<AssignRentalAccessoriesResult> {
    const context = this.errorContext(command);
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
      },
    });

    if (!rental) {
      return err(
        assignRentalAccessoriesError(
          'rental_commitment.rental_not_found',
          `Rental "${command.rentalId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    if (!ASSIGNABLE_RENTAL_STATUSES.has(rental.status)) {
      return err(
        assignRentalAccessoriesError(
          'rental_commitment.rental_status_does_not_allow_accessory_assignment',
          `Rental status "${rental.status}" does not allow accessory assignment.`,
          undefined,
          { ...context, rentalStatus: rental.status },
        ),
      );
    }

    const acceptedAssetBuffer = this.resolveAcceptedAssetBuffer(rental);
    const operationTime = new Date();
    const participationStart = operationTime < rental.periodStart ? rental.periodStart : operationTime;
    if (participationStart >= rental.periodEnd) {
      return err(
        assignRentalAccessoriesError(
          'rental_commitment.rental_status_does_not_allow_accessory_assignment',
          'Accessories cannot be assigned after the rental period has ended.',
          undefined,
          context,
        ),
      );
    }
    const operationalPeriod = deriveBufferedAssetBlockPeriod({
      participationPeriod: new RentalPeriod(participationStart, rental.periodEnd),
      beforeBufferMinutes: acceptedAssetBuffer.beforeBufferMinutes,
      afterBufferMinutes: acceptedAssetBuffer.afterBufferMinutes,
      ...(operationTime >= rental.periodStart ? { clampStartAt: operationTime } : {}),
    });

    const inputValidation = await this.validateInput(command, context);
    if (inputValidation.isErr()) return err(inputValidation.error);

    const existingSelections = await this.prisma.client.v2RentalAccessorySelection.findMany({
      where: { tenantId: command.tenantId, rentalOrderId: command.rentalId },
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

    const existingByKey = new Map(existingSelections.map((selection) => [this.selectionKey(selection), selection]));
    const newEquipmentTypeIds = command.accessories
      .filter((accessory) => !existingByKey.has(this.selectionKey(accessory)))
      .map((accessory) => accessory.equipmentTypeId);
    const equipmentTypeNames = await resolveEquipmentTypeNames(this.assetInventoryDisplayFacts, {
      tenantId: command.tenantId,
      equipmentTypeIds: newEquipmentTypeIds,
    });
    if (equipmentTypeNames.isErr()) {
      return err(
        assignRentalAccessoriesError(
          'rental_commitment.equipment_type_not_found',
          equipmentTypeNames.error.message,
          equipmentTypeNames.error,
          { ...context, equipmentTypeId: equipmentTypeNames.error.equipmentTypeId },
        ),
      );
    }

    const plannedSelections: PlannedSelection[] = [];
    const keptAssetIds: string[] = [];

    for (const accessory of command.accessories) {
      const existing = existingByKey.get(this.selectionKey(accessory));
      const keptAssignments = (existing?.assignments ?? []).slice(0, accessory.quantity);
      const selectionId = existing?.id ?? randomUUID();

      keptAssetIds.push(...keptAssignments.map((assignment) => assignment.assetId));
      plannedSelections.push({
        id: selectionId,
        sourceRentalDemandLineId: accessory.sourceRentalDemandLineId,
        equipmentTypeId: accessory.equipmentTypeId,
        equipmentTypeNameSnapshot:
          existing?.equipmentTypeNameSnapshot ?? equipmentTypeNames.value.get(accessory.equipmentTypeId),
        quantity: accessory.quantity,
        keptAssignmentIds: keptAssignments.map((assignment) => assignment.id),
        keptAssetIds: keptAssignments.map((assignment) => assignment.assetId),
        newAssetIds: [],
      });
    }

    const demandLines = plannedSelections
      .filter((selection) => selection.quantity > selection.keptAssetIds.length)
      .map((selection) => ({
        rentalDemandLineId: RentalDemandLineId.from(selection.id),
        rentalSelectionId: selection.id as RentalSelectionId,
        equipmentTypeId: selection.equipmentTypeId as EquipmentTypeId,
        quantity: selection.quantity - selection.keptAssetIds.length,
      }));

    const allocationPlan = await this.rentalAssetAllocation.planAllocations({
      tenantId: command.tenantId,
      branchId: rental.branchId,
      periodStart: operationalPeriod.start,
      periodEnd: operationalPeriod.end,
      demandLines,
      excludeAssetIds: keptAssetIds as AssetId[],
      ignoredBlockScope: {
        rentalId: command.rentalId,
        blockType: V2AssetBlockType.ACCESSORY,
      },
    });

    if (allocationPlan.isErr()) {
      if (allocationPlan.error instanceof InsufficientAssetAvailabilityError) {
        const availabilityError = allocationPlan.error as InsufficientAssetAvailabilityError;
        const selection = plannedSelections.find((candidate) => candidate.id === availabilityError.rentalSelectionId);
        if (!selection) {
          throw allocationPlan.error;
        }

        return err(
          assignRentalAccessoriesError(
            'rental_commitment.insufficient_asset_availability',
            availabilityError.message,
            availabilityError,
            {
              ...context,
              availability: {
                sourceRentalDemandLineId: selection.sourceRentalDemandLineId ?? null,
                equipmentTypeId: selection.equipmentTypeId,
                requestedQuantity: selection.quantity,
                availableQuantity: selection.keptAssetIds.length + availabilityError.availableQuantity,
              },
            },
          ),
        );
      }

      throw allocationPlan.error;
    }

    const newAssetIdsBySelectionId = new Map<string, string[]>();
    for (const allocation of allocationPlan.value.allocations) {
      const assetIds = newAssetIdsBySelectionId.get(allocation.rentalDemandLineId) ?? [];
      assetIds.push(allocation.assetId);
      newAssetIdsBySelectionId.set(allocation.rentalDemandLineId, assetIds);
    }

    for (const selection of plannedSelections) {
      selection.newAssetIds = newAssetIdsBySelectionId.get(selection.id) ?? [];
    }

    const accessoriesChanged = this.accessoryPlanChanged(existingSelections, plannedSelections);
    let persisted: boolean;
    try {
      persisted = await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
        const didPersist = await this.persistPlan(
          command,
          rental,
          existingSelections,
          plannedSelections,
          operationalPeriod,
          operationTime,
          tx,
        );
        if (
          didPersist &&
          accessoriesChanged &&
          rental.status === V2RentalStatus.CONFIRMED &&
          rental.customerId &&
          rental.fulfillmentMethod
        ) {
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
        }
        return didPersist;
      });
    } catch (error) {
      if (error instanceof PostgresExclusionViolationError) {
        return err(
          assignRentalAccessoriesError(
            'rental_commitment.asset_availability_changed',
            'Accessory availability changed while the assignment was being saved.',
            error,
            context,
          ),
        );
      }
      throw error;
    }

    if (!persisted) {
      return err(
        assignRentalAccessoriesError(
          'rental_commitment.rental_version_conflict',
          `Rental "${command.rentalId}" was modified by another request.`,
          undefined,
          context,
        ),
      );
    }

    return ok(undefined);
  }

  private async validateInput(
    command: AssignRentalAccessoriesCommand,
    context: Record<string, unknown>,
  ): Promise<Result<void, AssignRentalAccessoriesError>> {
    const sourceDemandLineIds = new Set<string>();
    const selectionKeys = new Set<string>();

    for (const [index, accessory] of command.accessories.entries()) {
      if (accessory.quantity <= 0) {
        return err(
          assignRentalAccessoriesError(
            'rental_commitment.invalid_accessory_quantity',
            `accessories.${index}.quantity must be a positive integer.`,
            undefined,
            { ...context, accessoryIndex: index },
          ),
        );
      }

      const key = this.selectionKey(accessory);
      if (selectionKeys.has(key)) {
        return err(
          assignRentalAccessoriesError(
            'rental_commitment.duplicate_accessory_selection',
            `accessories.${index} duplicates another accessory selection.`,
            undefined,
            { ...context, accessoryIndex: index },
          ),
        );
      }
      selectionKeys.add(key);

      if (accessory.sourceRentalDemandLineId) {
        sourceDemandLineIds.add(accessory.sourceRentalDemandLineId);
      }
    }

    if (sourceDemandLineIds.size > 0) {
      const count = await this.prisma.client.v2RentalDemandLine.count({
        where: {
          tenantId: command.tenantId,
          rentalId: command.rentalId,
          id: { in: [...sourceDemandLineIds] },
          removedAt: null,
        },
      });

      if (count !== sourceDemandLineIds.size) {
        return err(
          assignRentalAccessoriesError(
            'rental_commitment.source_rental_demand_line_not_found',
            'One or more source rental demand lines do not belong to this rental.',
            undefined,
            context,
          ),
        );
      }
    }

    return ok(undefined);
  }

  private errorContext(command: AssignRentalAccessoriesCommand): Record<string, unknown> {
    return {
      useCase: 'AssignRentalAccessories',
      tenantId: command.tenantId,
      rentalId: command.rentalId,
    };
  }

  private async persistPlan(
    command: AssignRentalAccessoriesCommand,
    rental: RentalReadModel,
    existingSelections: ExistingSelection[],
    plannedSelections: PlannedSelection[],
    operationalPeriod: RentalPeriod,
    operationTime: Date,
    tx: PrismaTransactionClient,
  ): Promise<boolean> {
    const plannedSelectionIds = new Set(plannedSelections.map((selection) => selection.id));
    const keptAssignmentIds = new Set(plannedSelections.flatMap((selection) => selection.keptAssignmentIds));
    const keptAssetIds = new Set(plannedSelections.flatMap((selection) => selection.keptAssetIds));
    const existingSelectionIds = existingSelections.map((selection) => selection.id);
    const removedAssignmentIds = existingSelections
      .flatMap((selection) => selection.assignments)
      .filter((assignment) => !keptAssignmentIds.has(assignment.id))
      .map((assignment) => assignment.id);
    const removedAssetIds = existingSelections
      .flatMap((selection) => selection.assignments)
      .filter((assignment) => !keptAssetIds.has(assignment.assetId))
      .map((assignment) => assignment.assetId);

    try {
      const claim = await tx.v2Rental.updateMany({
        where: { id: rental.id, tenantId: rental.tenantId, version: rental.version },
        data: { version: { increment: 1 } },
      });
      if (claim.count === 0) return false;

      if (removedAssignmentIds.length > 0) {
        await tx.v2RentalAccessoryAssetAssignment.deleteMany({
          where: { tenantId: command.tenantId, id: { in: removedAssignmentIds } },
        });
      }

      if (removedAssetIds.length > 0) {
        await tx.v2AssetBlock.deleteMany({
          where: {
            tenantId: command.tenantId,
            rentalId: command.rentalId,
            blockType: V2AssetBlockType.ACCESSORY,
            assetId: { in: removedAssetIds },
          },
        });
      }

      const obsoleteSelectionIds = existingSelectionIds.filter((id) => !plannedSelectionIds.has(id));
      if (obsoleteSelectionIds.length > 0) {
        await tx.v2RentalAccessorySelection.deleteMany({
          where: { tenantId: command.tenantId, id: { in: obsoleteSelectionIds } },
        });
      }

      for (const selection of plannedSelections) {
        await tx.v2RentalAccessorySelection.upsert({
          where: { id: selection.id },
          create: {
            id: selection.id,
            tenantId: command.tenantId,
            rentalOrderId: command.rentalId,
            sourceRentalDemandLineId: selection.sourceRentalDemandLineId,
            equipmentTypeId: selection.equipmentTypeId,
            equipmentTypeNameSnapshot: selection.equipmentTypeNameSnapshot,
            quantity: selection.quantity,
          },
          update: {
            sourceRentalDemandLineId: selection.sourceRentalDemandLineId,
            equipmentTypeId: selection.equipmentTypeId,
            equipmentTypeNameSnapshot: selection.equipmentTypeNameSnapshot,
            quantity: selection.quantity,
          },
        });

        if (selection.newAssetIds.length > 0) {
          await tx.v2RentalAccessoryAssetAssignment.createMany({
            data: selection.newAssetIds.map((assetId) => ({
              id: randomUUID(),
              tenantId: command.tenantId,
              rentalOrderId: command.rentalId,
              rentalAccessorySelectionId: selection.id,
              assetId,
            })),
          });

          for (const assetId of selection.newAssetIds) {
            await tx.$executeRaw`
              INSERT INTO v2_asset_blocks (
                id,
                tenant_id,
                rental_id,
                asset_id,
                period,
                block_type,
                created_at,
                released_at
              ) VALUES (
                ${randomUUID()},
                ${command.tenantId},
                ${command.rentalId},
                ${assetId},
                ${operationalPeriod.toPostgresRange()}::tstzrange,
                ${V2AssetBlockType.ACCESSORY},
                ${operationTime},
                ${null}
              )
            `;
          }
        }
      }

      return true;
    } catch (error) {
      mapPostgresError(error);
    }
  }

  private accessoryPlanChanged(
    existingSelections: ExistingSelection[],
    plannedSelections: PlannedSelection[],
  ): boolean {
    if (existingSelections.length !== plannedSelections.length) return true;

    const existingByKey = new Map(existingSelections.map((selection) => [this.selectionKey(selection), selection]));
    return plannedSelections.some((planned) => {
      const existing = existingByKey.get(this.selectionKey(planned));
      if (!existing || existing.quantity !== planned.quantity) return true;

      const existingAssetIds = existing.assignments.map((assignment) => assignment.assetId).sort();
      const plannedAssetIds = [...planned.keptAssetIds, ...planned.newAssetIds].sort();
      return (
        existingAssetIds.length !== plannedAssetIds.length ||
        existingAssetIds.some((assetId, index) => assetId !== plannedAssetIds[index])
      );
    });
  }

  private selectionKey(selection: { sourceRentalDemandLineId?: string | null; equipmentTypeId: string }): string {
    return `${selection.sourceRentalDemandLineId ?? ''}:${selection.equipmentTypeId}`;
  }

  private resolveAcceptedAssetBuffer(rental: RentalReadModel): {
    beforeBufferMinutes: number;
    afterBufferMinutes: number;
  } {
    const before = rental.acceptedBeforeBufferMinutes;
    const after = rental.acceptedAfterBufferMinutes;
    if (before === null || after === null) {
      throw new RentalInvalidFieldError('acceptedAssetBuffer', 'persisted buffer values must both be present');
    }
    return { beforeBufferMinutes: before, afterBufferMinutes: after };
  }
}
