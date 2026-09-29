import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaTransactionClient, PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { mapPostgresError, PostgresExclusionViolationError } from 'src/core/utils/postgres-error.mapper';
import { Prisma } from 'src/generated/prisma/client';
import { V2AssetBlockType, V2RentalStatus } from 'src/generated/prisma/enums';
import { AssetInventoryDisplayFacts } from 'src/modules/asset-inventory/public-api/asset-inventory-display-facts.public-api';

import { RentalAssetAllocationService } from '../asset-allocation/rental-asset-allocation.service';
import { deriveConfirmedAssetBlockPeriod } from '../domain/confirmed-asset-block-period';
import { InsufficientAssetAvailabilityError, RentalInvalidFieldError } from '../domain/errors/rental-commitment.errors';
import { RentalDemandLineId } from '../domain/ids/rental-demand-line-id';
import { AssetId, EquipmentTypeId, RentalSelectionId } from '../domain/types/rental-commitment-ids';
import { AcceptedDeliverySnapshot } from '../domain/value-objects/accepted-delivery-snapshot.value-object';
import { JsonValue } from '../domain/value-objects/json-snapshot.value-object';
import { RentalPeriod } from '../domain/value-objects/rental-period.value-object';
import { ConfirmedRentalEditedIntegrationEvent } from '../public-api/events/rental-lifecycle.integration-events';
import { resolveEquipmentTypeNames, ResolvedEquipmentTypeNames } from './equipment-type-display-facts';
import { getEffectiveRentalOperationTime } from './get-effective-rental-operation-time';

export type DesiredRentalAccessory = {
  sourceRentalDemandLineId?: string;
  equipmentTypeId: string;
  quantity: number;
};

export type DesiredDemandLineAccessory = {
  equipmentTypeId: string;
  quantity: number;
};

export type RentalAccessoryMutationOutcome = {
  rentalId: string;
  version: number;
  updatedAt: Date;
  changed: boolean;
};

export type RentalAccessoryMutationErrorCode =
  | 'RentalNotFound'
  | 'RentalVersionConflict'
  | 'RentalStatusDoesNotAllowAccessoryAssignment'
  | 'SourceRentalDemandLineNotFound'
  | 'InvalidAccessoryQuantity'
  | 'DuplicateAccessorySelection'
  | 'EquipmentTypeNotFound'
  | 'InsufficientAssetAvailability'
  | 'AssetAvailabilityChanged';

export type RentalAccessoryMutationError = {
  code: RentalAccessoryMutationErrorCode;
  message: string;
  cause?: unknown;
  rentalStatus?: V2RentalStatus;
  accessoryIndex?: number;
  equipmentTypeId?: string;
  availability?: {
    sourceRentalDemandLineId: string | null;
    equipmentTypeId: string;
    requestedQuantity: number;
    availableQuantity: number;
  };
};

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
  updatedAt: Date;
  acceptedBeforeBufferMinutes: number | null;
  acceptedAfterBufferMinutes: number | null;
  deliverySnapshot: Prisma.JsonValue | null;
};

type AccessorySelection = {
  id: string;
  sourceRentalDemandLineId: string | null;
  equipmentTypeId: string;
  equipmentTypeNameSnapshot: string;
  quantity: number;
  assignments: Array<{ id: string; assetId: string }>;
};

type DesiredAccessorySelection = {
  sourceRentalDemandLineId?: string;
  equipmentTypeId: string;
  quantity: number;
};

type PlannedAccessorySelection = {
  id: string;
  sourceRentalDemandLineId?: string;
  equipmentTypeId: string;
  equipmentTypeNameSnapshot: string;
  quantity: number;
  keptAssignmentIds: string[];
  keptAssetIds: string[];
  newAssetIds: string[];
};

type AccessoryMutationScope = { kind: 'rental' } | { kind: 'demand-line'; rentalDemandLineId: string };

type ReplaceAccessoriesInput = {
  tenantId: string;
  rentalId: string;
  expectedVersion: number;
  scope: AccessoryMutationScope;
  accessories: DesiredAccessorySelection[];
};

@Injectable()
export class RentalAccessoryMutations {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unitOfWork: PrismaUnitOfWork,
    private readonly rentalAssetAllocation: RentalAssetAllocationService,
    private readonly assetInventoryDisplayFacts: AssetInventoryDisplayFacts,
  ) {}

  replaceRentalAccessories(input: {
    tenantId: string;
    rentalId: string;
    expectedVersion: number;
    accessories: DesiredRentalAccessory[];
  }): Promise<Result<RentalAccessoryMutationOutcome, RentalAccessoryMutationError>> {
    return this.replaceAccessories({ ...input, scope: { kind: 'rental' } });
  }

  replaceDemandLineAccessories(input: {
    tenantId: string;
    rentalId: string;
    rentalDemandLineId: string;
    expectedVersion: number;
    accessories: DesiredDemandLineAccessory[];
  }): Promise<Result<RentalAccessoryMutationOutcome, RentalAccessoryMutationError>> {
    return this.replaceAccessories({
      tenantId: input.tenantId,
      rentalId: input.rentalId,
      expectedVersion: input.expectedVersion,
      scope: { kind: 'demand-line', rentalDemandLineId: input.rentalDemandLineId },
      accessories: input.accessories.map((accessory) => ({
        ...accessory,
        sourceRentalDemandLineId: input.rentalDemandLineId,
      })),
    });
  }

  private async replaceAccessories(
    input: ReplaceAccessoriesInput,
  ): Promise<Result<RentalAccessoryMutationOutcome, RentalAccessoryMutationError>> {
    const validation = this.validateAccessories(input.accessories);
    if (validation.isErr()) return err(validation.error);

    const initialRental = await this.loadRental(input.tenantId, input.rentalId);
    const initialRentalValidation = this.validateRental(initialRental, input);
    if (initialRentalValidation.isErr()) return err(initialRentalValidation.error);

    if (!(await this.sourceDemandLinesExist(input))) {
      return err(this.sourceDemandLineNotFound());
    }

    const initialSelections = await this.loadSelections(input);
    const names = await this.resolveNewEquipmentTypeNames(input, initialSelections);
    if (names.isErr()) return err(names.error);

    try {
      return await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
        // Serialize accessory edits on this rental before reading selections, including no-op requests.
        // Other confirmed edits claim the same rental row through optimistic version updates.
        await tx.$queryRaw`SELECT id FROM v2_rentals WHERE id = ${input.rentalId} AND tenant_id = ${input.tenantId} FOR UPDATE`;
        const rental = await this.loadRental(input.tenantId, input.rentalId, tx);
        const operationTime = new Date();
        const rentalValidation = this.validateRental(rental, input, operationTime);
        if (rentalValidation.isErr()) return err(rentalValidation.error);
        if (!rental) throw new Error('Validated accessory rental unexpectedly missing.');

        if (!(await this.sourceDemandLinesExist(input, tx))) {
          return err(this.sourceDemandLineNotFound());
        }

        const currentSelections = await this.loadSelections(input, tx);
        const desiredSelections = this.withNameSnapshots(input.accessories, currentSelections, names.value);
        const operationalPeriod = this.deriveOperationalPeriod(rental, operationTime);
        const protectedAssetIds = await this.loadProtectedAssetIds(input, tx);
        const plan = await this.plan({
          tenantId: input.tenantId,
          rentalId: input.rentalId,
          branchId: rental.branchId,
          operationalPeriod,
          currentSelections,
          desiredSelections,
          protectedAssetIds,
          tx,
        });
        if (plan.isErr()) return err(plan.error);

        if (!this.changed(currentSelections, plan.value)) {
          return ok({
            rentalId: rental.id,
            version: rental.version,
            updatedAt: rental.updatedAt,
            changed: false,
          });
        }

        const claimed = await tx.v2Rental.updateMany({
          where: { id: input.rentalId, tenantId: input.tenantId, version: input.expectedVersion },
          data: { version: { increment: 1 } },
        });
        if (claimed.count === 0) return err(this.versionConflict(input.rentalId));

        await this.persist({
          tenantId: input.tenantId,
          rentalId: input.rentalId,
          currentSelections,
          plannedSelections: plan.value,
          operationalPeriod,
          operationTime,
          tx,
        });

        if (rental.customerId) {
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
              operationTime,
            ),
          ]);
        }

        const updated = await tx.v2Rental.findUniqueOrThrow({
          where: { id: rental.id },
          select: { version: true, updatedAt: true },
        });
        return ok({ rentalId: rental.id, version: updated.version, updatedAt: updated.updatedAt, changed: true });
      });
    } catch (error) {
      if (error instanceof PostgresExclusionViolationError) {
        return err({
          code: 'AssetAvailabilityChanged',
          message: 'Accessory availability changed while the assignment was being saved.',
          cause: error,
        });
      }
      throw error;
    }
  }

  private async loadRental(
    tenantId: string,
    rentalId: string,
    tx?: PrismaTransactionClient,
  ): Promise<RentalReadModel | null> {
    const db = tx ?? this.prisma.client;
    return db.v2Rental.findFirst({
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
        updatedAt: true,
        acceptedBeforeBufferMinutes: true,
        acceptedAfterBufferMinutes: true,
        deliverySnapshot: true,
      },
    });
  }

  private validateRental(
    rental: RentalReadModel | null,
    input: ReplaceAccessoriesInput,
    operationTime = new Date(),
  ): Result<void, RentalAccessoryMutationError> {
    if (!rental) {
      return err({ code: 'RentalNotFound', message: `Rental "${input.rentalId}" was not found.` });
    }
    if (rental.version !== input.expectedVersion) return err(this.versionConflict(input.rentalId));
    if (rental.status !== V2RentalStatus.CONFIRMED) {
      return err({
        code: 'RentalStatusDoesNotAllowAccessoryAssignment',
        message: `Rental status "${rental.status}" does not allow accessory assignment.`,
        rentalStatus: rental.status,
      });
    }
    if (getEffectiveRentalOperationTime(operationTime, rental.periodStart) >= rental.periodEnd) {
      return err({
        code: 'RentalStatusDoesNotAllowAccessoryAssignment',
        message: 'Accessories cannot be assigned after the rental period has ended.',
      });
    }
    return ok(undefined);
  }

  private validateAccessories(accessories: DesiredAccessorySelection[]): Result<void, RentalAccessoryMutationError> {
    const keys = new Set<string>();
    for (const [accessoryIndex, accessory] of accessories.entries()) {
      if (accessory.quantity <= 0 || !Number.isInteger(accessory.quantity)) {
        return err({
          code: 'InvalidAccessoryQuantity',
          message: `accessories.${accessoryIndex}.quantity must be a positive integer.`,
          accessoryIndex,
        });
      }
      const key = selectionKey(accessory);
      if (keys.has(key)) {
        return err({
          code: 'DuplicateAccessorySelection',
          message: `accessories.${accessoryIndex} duplicates another accessory selection.`,
          accessoryIndex,
        });
      }
      keys.add(key);
    }
    return ok(undefined);
  }

  private async sourceDemandLinesExist(input: ReplaceAccessoriesInput, tx?: PrismaTransactionClient): Promise<boolean> {
    const demandLineIds = [
      ...new Set(
        input.accessories.flatMap((accessory) =>
          accessory.sourceRentalDemandLineId ? [accessory.sourceRentalDemandLineId] : [],
        ),
      ),
    ];
    if (input.scope.kind === 'demand-line' && !demandLineIds.includes(input.scope.rentalDemandLineId)) {
      demandLineIds.push(input.scope.rentalDemandLineId);
    }
    if (demandLineIds.length === 0) return true;

    const db = tx ?? this.prisma.client;
    const count = await db.v2RentalDemandLine.count({
      where: {
        tenantId: input.tenantId,
        rentalId: input.rentalId,
        id: { in: demandLineIds },
        removedAt: null,
      },
    });
    return count === demandLineIds.length;
  }

  private async loadSelections(
    input: Pick<ReplaceAccessoriesInput, 'tenantId' | 'rentalId' | 'scope'>,
    tx?: PrismaTransactionClient,
  ): Promise<AccessorySelection[]> {
    const db = tx ?? this.prisma.client;
    return db.v2RentalAccessorySelection.findMany({
      where: {
        tenantId: input.tenantId,
        rentalOrderId: input.rentalId,
        ...(input.scope.kind === 'demand-line' ? { sourceRentalDemandLineId: input.scope.rentalDemandLineId } : {}),
      },
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

  private async resolveNewEquipmentTypeNames(
    input: ReplaceAccessoriesInput,
    currentSelections: AccessorySelection[],
  ): Promise<Result<ResolvedEquipmentTypeNames, RentalAccessoryMutationError>> {
    const currentKeys = new Set(currentSelections.map(selectionKey));
    const newTypeIds = input.accessories
      .filter((accessory) => !currentKeys.has(selectionKey(accessory)))
      .map((accessory) => accessory.equipmentTypeId);
    const names = await resolveEquipmentTypeNames(this.assetInventoryDisplayFacts, {
      tenantId: input.tenantId,
      equipmentTypeIds: newTypeIds,
    });
    if (names.isErr()) {
      return err({
        code: 'EquipmentTypeNotFound',
        message: names.error.message,
        cause: names.error,
        equipmentTypeId: names.error.equipmentTypeId,
      });
    }
    return ok(names.value);
  }

  private withNameSnapshots(
    desiredSelections: DesiredAccessorySelection[],
    currentSelections: AccessorySelection[],
    names: ResolvedEquipmentTypeNames,
  ): Array<DesiredAccessorySelection & { equipmentTypeNameSnapshot: string }> {
    const currentByKey = new Map(currentSelections.map((selection) => [selectionKey(selection), selection]));
    return desiredSelections.map((selection) => ({
      ...selection,
      equipmentTypeNameSnapshot:
        currentByKey.get(selectionKey(selection))?.equipmentTypeNameSnapshot ?? names.get(selection.equipmentTypeId),
    }));
  }

  private deriveOperationalPeriod(rental: RentalReadModel, operationTime: Date): RentalPeriod {
    if (rental.acceptedBeforeBufferMinutes === null || rental.acceptedAfterBufferMinutes === null) {
      throw new RentalInvalidFieldError('acceptedAssetBuffer', 'persisted buffer values must both be present');
    }
    let acceptedDelivery: AcceptedDeliverySnapshot | undefined;
    if (rental.deliverySnapshot !== null) {
      // SAFETY: This value is composed only of JSON-compatible primitives, arrays, and objects before it crosses the Prisma JSON boundary.
      const parsed = AcceptedDeliverySnapshot.create(rental.deliverySnapshot as JsonValue);
      if (parsed.isErr()) throw parsed.error;
      acceptedDelivery = parsed.value;
    }
    const participationStart = getEffectiveRentalOperationTime(operationTime, rental.periodStart);
    return deriveConfirmedAssetBlockPeriod({
      participationPeriod: new RentalPeriod(participationStart, rental.periodEnd),
      acceptedBeforeBufferMinutes: rental.acceptedBeforeBufferMinutes,
      acceptedAfterBufferMinutes: rental.acceptedAfterBufferMinutes,
      acceptedDelivery,
      ...(operationTime >= rental.periodStart ? { clampStartAt: operationTime } : {}),
    });
  }

  private async loadProtectedAssetIds(input: ReplaceAccessoriesInput, tx: PrismaTransactionClient): Promise<string[]> {
    if (input.scope.kind === 'rental') return [];
    const rows = await tx.v2RentalAccessoryAssetAssignment.findMany({
      where: {
        tenantId: input.tenantId,
        rentalOrderId: input.rentalId,
        rentalAccessorySelection: {
          OR: [
            { sourceRentalDemandLineId: null },
            { sourceRentalDemandLineId: { not: input.scope.rentalDemandLineId } },
          ],
        },
      },
      select: { assetId: true },
    });
    return rows.map(({ assetId }) => assetId);
  }

  private async plan(input: {
    tenantId: string;
    rentalId: string;
    branchId: string;
    operationalPeriod: RentalPeriod;
    currentSelections: AccessorySelection[];
    desiredSelections: Array<DesiredAccessorySelection & { equipmentTypeNameSnapshot: string }>;
    protectedAssetIds: readonly string[];
    tx: PrismaTransactionClient;
  }): Promise<Result<PlannedAccessorySelection[], RentalAccessoryMutationError>> {
    const currentByKey = new Map(input.currentSelections.map((selection) => [selectionKey(selection), selection]));
    const plannedSelections: PlannedAccessorySelection[] = input.desiredSelections.map((desired) => {
      const current = currentByKey.get(selectionKey(desired));
      const keptAssignments = (current?.assignments ?? []).slice(0, desired.quantity);
      return {
        id: current?.id ?? randomUUID(),
        ...(desired.sourceRentalDemandLineId ? { sourceRentalDemandLineId: desired.sourceRentalDemandLineId } : {}),
        equipmentTypeId: desired.equipmentTypeId,
        equipmentTypeNameSnapshot: current?.equipmentTypeNameSnapshot ?? desired.equipmentTypeNameSnapshot,
        quantity: desired.quantity,
        keptAssignmentIds: keptAssignments.map((assignment) => assignment.id),
        keptAssetIds: keptAssignments.map((assignment) => assignment.assetId),
        newAssetIds: [],
      };
    });

    const demandLines = plannedSelections
      .filter((selection) => selection.quantity > selection.keptAssetIds.length)
      .map((selection) => ({
        rentalDemandLineId: RentalDemandLineId.from(selection.id),
        // SAFETY: The selection ID is a persisted or generated non-empty identifier; the brand adds no runtime representation.
        rentalSelectionId: selection.id as RentalSelectionId,
        // SAFETY: The equipment type ID was validated for a new selection or loaded from persistence; the brand adds no runtime representation.
        equipmentTypeId: selection.equipmentTypeId as EquipmentTypeId,
        quantity: selection.quantity - selection.keptAssetIds.length,
      }));
    const retainedAssetIds = plannedSelections.flatMap((selection) => selection.keptAssetIds);
    // SAFETY: These IDs come from persisted assignments; the brand adds no runtime representation.
    const excludedAssetIds = [...retainedAssetIds, ...input.protectedAssetIds] as AssetId[];
    const allocation = await this.rentalAssetAllocation.planAllocations({
      tenantId: input.tenantId,
      branchId: input.branchId,
      periodStart: input.operationalPeriod.start,
      periodEnd: input.operationalPeriod.end,
      demandLines,
      excludeAssetIds: excludedAssetIds,
      ignoredBlockScope: { rentalId: input.rentalId, blockType: V2AssetBlockType.ACCESSORY },
      tx: input.tx,
    });
    if (allocation.isErr()) {
      const availability = allocation.error;
      if (availability instanceof InsufficientAssetAvailabilityError) {
        const selection = plannedSelections.find(({ id }) => id === availability.rentalSelectionId);
        if (!selection) throw allocation.error;
        return err({
          code: 'InsufficientAssetAvailability',
          message: allocation.error.message,
          cause: allocation.error,
          availability: {
            sourceRentalDemandLineId: selection.sourceRentalDemandLineId ?? null,
            equipmentTypeId: selection.equipmentTypeId,
            requestedQuantity: selection.quantity,
            availableQuantity: selection.keptAssetIds.length + availability.availableQuantity,
          },
        });
      }
      throw allocation.error;
    }

    const allocatedBySelection = new Map<string, string[]>();
    for (const item of allocation.value.allocations) {
      const assetIds = allocatedBySelection.get(item.rentalDemandLineId) ?? [];
      assetIds.push(item.assetId);
      allocatedBySelection.set(item.rentalDemandLineId, assetIds);
    }
    for (const selection of plannedSelections) {
      selection.newAssetIds = allocatedBySelection.get(selection.id) ?? [];
    }
    return ok(plannedSelections);
  }

  private changed(currentSelections: AccessorySelection[], plannedSelections: PlannedAccessorySelection[]): boolean {
    if (currentSelections.length !== plannedSelections.length) return true;
    const currentByKey = new Map(currentSelections.map((selection) => [selectionKey(selection), selection]));
    return plannedSelections.some((planned) => {
      const current = currentByKey.get(selectionKey(planned));
      if (!current || current.quantity !== planned.quantity) return true;
      const currentAssets = current.assignments.map(({ assetId }) => assetId).sort();
      const plannedAssets = [...planned.keptAssetIds, ...planned.newAssetIds].sort();
      return (
        currentAssets.length !== plannedAssets.length || currentAssets.some((id, index) => id !== plannedAssets[index])
      );
    });
  }

  private async persist(input: {
    tenantId: string;
    rentalId: string;
    currentSelections: AccessorySelection[];
    plannedSelections: PlannedAccessorySelection[];
    operationalPeriod: RentalPeriod;
    operationTime: Date;
    tx: PrismaTransactionClient;
  }): Promise<void> {
    const plannedSelectionIds = new Set(input.plannedSelections.map((selection) => selection.id));
    const keptAssignmentIds = new Set(input.plannedSelections.flatMap((selection) => selection.keptAssignmentIds));
    const keptAssetIds = new Set(input.plannedSelections.flatMap((selection) => selection.keptAssetIds));
    const removedAssignments = input.currentSelections
      .flatMap((selection) => selection.assignments)
      .filter((assignment) => !keptAssignmentIds.has(assignment.id));

    try {
      if (removedAssignments.length > 0) {
        await input.tx.v2RentalAccessoryAssetAssignment.deleteMany({
          where: { tenantId: input.tenantId, id: { in: removedAssignments.map(({ id }) => id) } },
        });
        await input.tx.v2AssetBlock.deleteMany({
          where: {
            tenantId: input.tenantId,
            rentalId: input.rentalId,
            blockType: V2AssetBlockType.ACCESSORY,
            assetId: {
              in: removedAssignments.filter(({ assetId }) => !keptAssetIds.has(assetId)).map(({ assetId }) => assetId),
            },
          },
        });
      }

      const obsoleteSelectionIds = input.currentSelections
        .map(({ id }) => id)
        .filter((id) => !plannedSelectionIds.has(id));
      if (obsoleteSelectionIds.length > 0) {
        await input.tx.v2RentalAccessorySelection.deleteMany({
          where: { tenantId: input.tenantId, id: { in: obsoleteSelectionIds } },
        });
      }

      for (const selection of input.plannedSelections) {
        await input.tx.v2RentalAccessorySelection.upsert({
          where: { id: selection.id },
          create: {
            id: selection.id,
            tenantId: input.tenantId,
            rentalOrderId: input.rentalId,
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
        if (selection.newAssetIds.length === 0) continue;

        await input.tx.v2RentalAccessoryAssetAssignment.createMany({
          data: selection.newAssetIds.map((assetId) => ({
            id: randomUUID(),
            tenantId: input.tenantId,
            rentalOrderId: input.rentalId,
            rentalAccessorySelectionId: selection.id,
            assetId,
          })),
        });
        for (const assetId of selection.newAssetIds) {
          await input.tx.$executeRaw`
            INSERT INTO v2_asset_blocks (id, tenant_id, rental_id, asset_id, period, block_type, created_at, released_at)
            VALUES (${randomUUID()}, ${input.tenantId}, ${input.rentalId}, ${assetId},
              ${input.operationalPeriod.toPostgresRange()}::tstzrange, ${V2AssetBlockType.ACCESSORY},
              ${input.operationTime}, ${null})
          `;
        }
      }
    } catch (error) {
      mapPostgresError(error);
    }
  }

  private sourceDemandLineNotFound(): RentalAccessoryMutationError {
    return {
      code: 'SourceRentalDemandLineNotFound',
      message: 'One or more source rental demand lines do not belong to this rental.',
    };
  }

  private versionConflict(rentalId: string): RentalAccessoryMutationError {
    return {
      code: 'RentalVersionConflict',
      message: `Rental "${rentalId}" was modified by another request.`,
    };
  }
}

function selectionKey(selection: { sourceRentalDemandLineId?: string | null; equipmentTypeId: string }): string {
  return `${selection.sourceRentalDemandLineId ?? ''}:${selection.equipmentTypeId}`;
}
