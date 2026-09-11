import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';
import { mapPostgresError } from 'src/core/utils/postgres-error.mapper';
import { V2AssetBlockType } from 'src/generated/prisma/enums';

import { RentalAssetAllocationService } from '../asset-allocation/rental-asset-allocation.service';
import { RentalDemandLineId } from '../domain/ids/rental-demand-line-id';
import { AssetId, EquipmentTypeId, RentalSelectionId } from '../domain/types/rental-commitment-ids';
import { RentalPeriod } from '../domain/value-objects/rental-period.value-object';
import { InsufficientAssetAvailabilityError, RentalCommitmentError } from '../domain/errors/rental-commitment.errors';

export type AccessorySelectionForReconciliation = {
  id: string;
  sourceRentalDemandLineId: string | null;
  equipmentTypeId: string;
  equipmentTypeNameSnapshot: string;
  quantity: number;
  assignments: Array<{ id: string; assetId: string }>;
};

export type DesiredAccessorySelection = {
  sourceRentalDemandLineId?: string | null;
  equipmentTypeId: string;
  equipmentTypeNameSnapshot: string;
  quantity: number;
};

export class AccessoryReconciliationAvailabilityError extends RentalCommitmentError {
  constructor(
    public readonly selection: PlannedAccessorySelection,
    public readonly cause: InsufficientAssetAvailabilityError,
  ) {
    super(cause.message);
  }
}

export type PlannedAccessorySelection = {
  id: string;
  sourceRentalDemandLineId?: string;
  equipmentTypeId: string;
  equipmentTypeNameSnapshot: string;
  quantity: number;
  keptAssignmentIds: string[];
  keptAssetIds: string[];
  newAssetIds: string[];
};

@Injectable()
export class AccessorySelectionReconciliationService {
  constructor(private readonly rentalAssetAllocation: RentalAssetAllocationService) {}

  async plan(input: {
    tenantId: string;
    rentalId: string;
    branchId: string;
    operationalPeriod: RentalPeriod;
    currentSelections: AccessorySelectionForReconciliation[];
    desiredSelections: DesiredAccessorySelection[];
    protectedAssetIds?: readonly string[];
  }): Promise<Result<PlannedAccessorySelection[], RentalCommitmentError>> {
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
        rentalSelectionId: selection.id as RentalSelectionId,
        equipmentTypeId: selection.equipmentTypeId as EquipmentTypeId,
        quantity: selection.quantity - selection.keptAssetIds.length,
      }));
    const retainedAssetIds = plannedSelections.flatMap((selection) => selection.keptAssetIds);
    const allocation = await this.rentalAssetAllocation.planAllocations({
      tenantId: input.tenantId,
      branchId: input.branchId,
      periodStart: input.operationalPeriod.start,
      periodEnd: input.operationalPeriod.end,
      demandLines,
      excludeAssetIds: [...retainedAssetIds, ...(input.protectedAssetIds ?? [])] as AssetId[],
      ignoredBlockScope: { rentalId: input.rentalId, blockType: V2AssetBlockType.ACCESSORY },
    });
    if (allocation.isErr()) {
      if (allocation.error instanceof InsufficientAssetAvailabilityError) {
        const availabilityError = allocation.error;
        const selection = plannedSelections.find(({ id }) => id === availabilityError.rentalSelectionId);
        if (!selection) throw availabilityError;
        return err(new AccessoryReconciliationAvailabilityError(selection, availabilityError));
      }
      return err(allocation.error);
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

  async persist(input: {
    tenantId: string;
    rentalId: string;
    expectedVersion: number;
    currentSelections: AccessorySelectionForReconciliation[];
    plannedSelections: PlannedAccessorySelection[];
    operationalPeriod: RentalPeriod;
    operationTime: Date;
    tx: PrismaTransactionClient;
  }): Promise<boolean> {
    const plannedSelectionIds = new Set(input.plannedSelections.map((selection) => selection.id));
    const keptAssignmentIds = new Set(input.plannedSelections.flatMap((selection) => selection.keptAssignmentIds));
    const keptAssetIds = new Set(input.plannedSelections.flatMap((selection) => selection.keptAssetIds));
    const removedAssignments = input.currentSelections
      .flatMap((selection) => selection.assignments)
      .filter((assignment) => !keptAssignmentIds.has(assignment.id));

    try {
      const claim = await input.tx.v2Rental.updateMany({
        where: { id: input.rentalId, tenantId: input.tenantId, version: input.expectedVersion },
        data: { version: { increment: 1 } },
      });
      if (claim.count === 0) return false;

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
      return true;
    } catch (error) {
      mapPostgresError(error);
    }
  }

  changed(
    currentSelections: AccessorySelectionForReconciliation[],
    plannedSelections: PlannedAccessorySelection[],
  ): boolean {
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
}

export function accessorySelectionKey(selection: {
  sourceRentalDemandLineId?: string | null;
  equipmentTypeId: string;
}): string {
  return selectionKey(selection);
}

function selectionKey(selection: { sourceRentalDemandLineId?: string | null; equipmentTypeId: string }): string {
  return `${selection.sourceRentalDemandLineId ?? ''}:${selection.equipmentTypeId}`;
}
