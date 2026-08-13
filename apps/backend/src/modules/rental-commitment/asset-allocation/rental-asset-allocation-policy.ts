import { err, ok, Result } from 'neverthrow';

import { AssetCandidate, RentalAssetCandidateStatus, RentalAssetOwnershipKind } from './asset-candidate.projection';
import { InsufficientAssetAvailabilityError, RentalCommitmentError } from '../domain/errors/rental-commitment.errors';
import { OwnerContractSnapshot } from '../domain/value-objects/owner-contract-snapshot.value-object';
import { AssetId, EquipmentTypeId, RentalSelectionId } from '../domain/types/rental-commitment-ids';
import { RentalDemandLineId } from '../domain/ids/rental-demand-line-id';

export interface RentalAssetAllocationDemandLine {
  readonly rentalDemandLineId: RentalDemandLineId;
  readonly rentalSelectionId: RentalSelectionId;
  readonly equipmentTypeId: EquipmentTypeId;
  readonly quantity: number;
}

export interface OverlappingReservedAsset {
  readonly assetId: AssetId;
}

export interface RentalAssetAllocationPlanLine {
  readonly rentalDemandLineId: RentalDemandLineId;
  readonly equipmentTypeId: EquipmentTypeId;
  readonly assetId: AssetId;
  readonly ownerId: string | undefined;
  readonly ownershipKind: RentalAssetOwnershipKind;
  readonly ownerContractSnapshot: OwnerContractSnapshot | null;
}

export interface RentalAssetAllocationPlan {
  readonly allocations: RentalAssetAllocationPlanLine[];
}

export class RentalAssetAllocationPolicy {
  planAllocations(params: {
    readonly demandLines: readonly RentalAssetAllocationDemandLine[];
    readonly candidates: readonly AssetCandidate[];
    readonly overlappingReservedAssets: readonly OverlappingReservedAsset[];
    readonly preferredAssetIdsByDemandLineId?: ReadonlyMap<RentalDemandLineId, readonly AssetId[]>;
  }): Result<RentalAssetAllocationPlan, RentalCommitmentError> {
    const reservedAssetIds = new Set(params.overlappingReservedAssets.map((asset) => asset.assetId));
    const candidatesByEquipmentType = this.groupAllocatableCandidatesByEquipmentType(
      params.candidates,
      reservedAssetIds,
    );
    const usedAssetIds = new Set<AssetId>();
    const allocations: RentalAssetAllocationPlanLine[] = [];

    for (const demandLine of params.demandLines) {
      const availableCandidates = this.orderByDemandLinePreference(
        (candidatesByEquipmentType.get(demandLine.equipmentTypeId) ?? []).filter(
          (candidate) => !usedAssetIds.has(candidate.assetId),
        ),
        params.preferredAssetIdsByDemandLineId?.get(demandLine.rentalDemandLineId),
      );

      if (availableCandidates.length < demandLine.quantity) {
        return err(
          new InsufficientAssetAvailabilityError(
            demandLine.equipmentTypeId,
            demandLine.rentalSelectionId,
            demandLine.quantity,
            availableCandidates.length,
          ),
        );
      }

      for (const candidate of availableCandidates.slice(0, demandLine.quantity)) {
        usedAssetIds.add(candidate.assetId);
        allocations.push({
          rentalDemandLineId: demandLine.rentalDemandLineId,
          equipmentTypeId: demandLine.equipmentTypeId,
          assetId: candidate.assetId,
          ownerId: candidate.ownerId,
          ownershipKind: candidate.ownershipKind,
          ownerContractSnapshot: candidate.ownerContractSnapshot ?? null,
        });
      }
    }

    return ok({ allocations });
  }

  private orderByDemandLinePreference(
    candidates: readonly AssetCandidate[],
    preferredAssetIds: readonly AssetId[] | undefined,
  ): AssetCandidate[] {
    if (!preferredAssetIds?.length) {
      return [...candidates];
    }

    const preferredOrder = new Map(preferredAssetIds.map((assetId, index) => [assetId, index]));
    return [...candidates].sort((left, right) => {
      const leftOrder = preferredOrder.get(left.assetId);
      const rightOrder = preferredOrder.get(right.assetId);
      if (leftOrder !== undefined && rightOrder !== undefined) return leftOrder - rightOrder;
      if (leftOrder !== undefined) return -1;
      if (rightOrder !== undefined) return 1;
      return left.assetId.localeCompare(right.assetId);
    });
  }

  eligibleCandidates(candidates: readonly AssetCandidate[], reservedAssetIds: ReadonlySet<AssetId>): AssetCandidate[] {
    return candidates.filter((candidate) => this.isAllocatable(candidate, reservedAssetIds));
  }

  private groupAllocatableCandidatesByEquipmentType(
    candidates: readonly AssetCandidate[],
    reservedAssetIds: ReadonlySet<AssetId>,
  ): Map<EquipmentTypeId, AssetCandidate[]> {
    const grouped = new Map<EquipmentTypeId, AssetCandidate[]>();

    for (const candidate of candidates) {
      if (!this.isAllocatable(candidate, reservedAssetIds)) {
        continue;
      }

      const existing = grouped.get(candidate.equipmentTypeId) ?? [];
      existing.push(candidate);
      grouped.set(candidate.equipmentTypeId, existing);
    }

    for (const group of grouped.values()) {
      group.sort((a, b) => a.assetId.localeCompare(b.assetId));
    }

    return grouped;
  }

  private isAllocatable(candidate: AssetCandidate, reservedAssetIds: ReadonlySet<AssetId>): boolean {
    return (
      candidate.assetStatus === RentalAssetCandidateStatus.Active &&
      (candidate.ownershipKind !== RentalAssetOwnershipKind.ThirdParty || Boolean(candidate.ownerContractSnapshot)) &&
      !reservedAssetIds.has(candidate.assetId)
    );
  }
}
