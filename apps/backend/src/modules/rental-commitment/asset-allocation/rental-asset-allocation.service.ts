import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';
import { Prisma } from 'src/generated/prisma/client';
import { V2AssetBlockType } from 'src/generated/prisma/enums';
import {
  AssetAssignmentFact,
  AssetAssignmentFacts,
} from 'src/modules/asset-inventory/public-api/asset-assignment-facts.public-api';

import {
  OverlappingReservedAsset,
  RentalAssetAllocationDemandLine,
  RentalAssetAllocationPlan,
  RentalAssetAllocationPolicy,
} from './rental-asset-allocation-policy';
import { AssetCandidate, RentalAssetCandidateStatus, RentalAssetOwnershipKind } from './asset-candidate';
import { RentalCommitmentError, RentalInvalidFieldError } from '../domain/errors/rental-commitment.errors';
import {
  OwnerContractBasis,
  OwnerContractSnapshot,
} from '../domain/value-objects/owner-contract-snapshot.value-object';
import { RentalPeriod } from '../domain/value-objects/rental-period.value-object';
import { AssetId, EquipmentTypeId } from '../domain/types/rental-commitment-ids';
import { RentalDemandLineId } from '../domain/ids/rental-demand-line-id';

interface PlanAssetAllocationsParams {
  tenantId: string;
  branchId: string;
  operationTime: Date;
  periodStart: Date;
  periodEnd: Date;
  demandLines: readonly RentalAssetAllocationDemandLine[];
  excludeAssetIds?: readonly AssetId[];
  preferredAssetIdsByDemandLineId?: ReadonlyMap<RentalDemandLineId, readonly AssetId[]>;
  ignoredBlockScope?: {
    rentalId: string;
    blockType: V2AssetBlockType;
  };
  tx?: PrismaTransactionClient;
}

interface ActiveAssetReservationRow {
  assetId: string;
}

type IgnoredBlockScope =
  | {
      rentalId: string;
      blockType: V2AssetBlockType;
    }
  | {
      rentalId: string;
      allBlockTypes: true;
    };

@Injectable()
export class RentalAssetAllocationService {
  private readonly allocationPolicy = new RentalAssetAllocationPolicy();

  constructor(
    private readonly prisma: PrismaService,
    private readonly assetAssignmentFacts: AssetAssignmentFacts,
  ) {}

  async findEligibleAvailableCandidates(params: {
    tenantId: string;
    branchId: string;
    equipmentTypeIds: readonly EquipmentTypeId[];
    operationTime: Date;
    periodStart: Date;
    periodEnd: Date;
    excludeAssetIds?: readonly AssetId[];
  }): Promise<Result<AssetCandidate[], RentalCommitmentError>> {
    const candidates = await this.findAssetCandidates({
      tenantId: params.tenantId,
      branchId: params.branchId,
      equipmentTypeIds: params.equipmentTypeIds,
      operationTime: params.operationTime,
    });
    if (candidates.isErr()) return err(candidates.error);

    const reservations = await this.findActiveOverlappingReservations({
      tenantId: params.tenantId,
      assetIds: candidates.value.map((candidate) => candidate.assetId),
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
    });
    const reservedAssetIds = new Set([
      ...reservations.map((reservation) => reservation.assetId),
      ...(params.excludeAssetIds ?? []),
    ]);

    return ok(this.allocationPolicy.eligibleCandidates(candidates.value, reservedAssetIds));
  }

  async findConflictingExactAssetIds(params: {
    tenantId: string;
    currentRentalId: string;
    assetIds: readonly AssetId[];
    periodStart: Date;
    periodEnd: Date;
    tx?: PrismaTransactionClient;
  }): Promise<AssetId[]> {
    const reservations = await this.findActiveOverlappingReservations({
      tenantId: params.tenantId,
      assetIds: params.assetIds,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      ignoredBlockScope: { rentalId: params.currentRentalId, allBlockTypes: true },
      tx: params.tx,
    });

    return [...new Set(reservations.map((reservation) => reservation.assetId))];
  }

  async planAllocations(
    params: PlanAssetAllocationsParams,
  ): Promise<Result<RentalAssetAllocationPlan, RentalCommitmentError>> {
    const equipmentTypeIds = [...new Set(params.demandLines.map((line) => line.equipmentTypeId))];
    if (equipmentTypeIds.length === 0) {
      return ok({ allocations: [] });
    }

    const candidates = await this.findAssetCandidates({
      tenantId: params.tenantId,
      branchId: params.branchId,
      equipmentTypeIds,
      operationTime: params.operationTime,
    });
    if (candidates.isErr()) {
      return err(candidates.error);
    }

    const overlappingReservedAssets = await this.findActiveOverlappingReservations({
      tenantId: params.tenantId,
      assetIds: candidates.value.map((candidate) => candidate.assetId),
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      ignoredBlockScope: params.ignoredBlockScope,
      tx: params.tx,
    });

    return this.allocationPolicy.planAllocations({
      demandLines: params.demandLines,
      candidates: candidates.value,
      overlappingReservedAssets: [
        ...overlappingReservedAssets,
        ...(params.excludeAssetIds ?? []).map((assetId) => ({ assetId })),
      ],
      preferredAssetIdsByDemandLineId: params.preferredAssetIdsByDemandLineId,
    });
  }

  private async findAssetCandidates(params: {
    tenantId: string;
    branchId: string;
    equipmentTypeIds: readonly EquipmentTypeId[];
    operationTime: Date;
  }): Promise<Result<AssetCandidate[], RentalCommitmentError>> {
    const rows = await this.assetAssignmentFacts.getAssetAssignmentFacts(params);

    const candidates: AssetCandidate[] = [];

    for (const row of rows) {
      const ownershipKind =
        row.ownerId === null ? RentalAssetOwnershipKind.TenantOwned : RentalAssetOwnershipKind.ThirdParty;
      const assetStatus = this.mapAssetStatus(row.status);
      if (!assetStatus) {
        return err(new RentalInvalidFieldError('assetStatus', `unsupported value "${row.status}"`));
      }

      const ownerContractSnapshot = this.mapOwnerContractSnapshot(row.ownerId, row.ownerContract);
      if (ownerContractSnapshot.isErr()) {
        return err(ownerContractSnapshot.error);
      }

      // SAFETY: This value comes from a persisted or already validated non-empty domain identifier; the brand adds no runtime representation.
      candidates.push({
        tenantId: params.tenantId,
        assetId: row.assetId as AssetId,
        branchId: params.branchId,
        equipmentTypeId: row.equipmentTypeId as EquipmentTypeId,
        assetStatus,
        ownershipKind,
        ownerId: row.ownerId ?? undefined,
        ownerContractSnapshot: ownerContractSnapshot.value ?? undefined,
      });
    }

    return ok(candidates);
  }

  private async findActiveOverlappingReservations(params: {
    tenantId: string;
    assetIds: readonly AssetId[];
    periodStart: Date;
    periodEnd: Date;
    ignoredBlockScope?: IgnoredBlockScope;
    tx?: PrismaTransactionClient;
  }): Promise<OverlappingReservedAsset[]> {
    if (params.assetIds.length === 0) {
      return [];
    }

    const period = new RentalPeriod(params.periodStart, params.periodEnd).toPostgresRange();

    const assetIds = params.assetIds.map(String);

    let ignoredBlockScopeSql: Prisma.Sql = Prisma.empty;
    if (params.ignoredBlockScope) {
      if ('allBlockTypes' in params.ignoredBlockScope) {
        ignoredBlockScopeSql = Prisma.sql`AND rental_id <> ${params.ignoredBlockScope.rentalId}`;
      } else {
        ignoredBlockScopeSql = Prisma.sql`
          AND NOT (
            rental_id = ${params.ignoredBlockScope.rentalId}
            AND block_type = ${params.ignoredBlockScope.blockType}::"V2AssetBlockType"
          )
        `;
      }
    }

    const db = params.tx ?? this.prisma.client;
    const rows = await db.$queryRaw<ActiveAssetReservationRow[]>(Prisma.sql`
      SELECT asset_id AS "assetId"
      FROM v2_asset_blocks
      WHERE tenant_id = ${params.tenantId}
        AND released_at IS NULL
        AND asset_id IN (${Prisma.join(assetIds)})
        AND period && ${period}::tstzrange
        ${ignoredBlockScopeSql}
    `);

    // SAFETY: This value comes from a persisted or already validated non-empty domain identifier; the brand adds no runtime representation.
    return rows.map((row) => ({ assetId: row.assetId as AssetId }));
  }

  private mapAssetStatus(value: string): RentalAssetCandidateStatus | undefined {
    return Object.values(RentalAssetCandidateStatus).find((status) => status === value);
  }

  private mapOwnerContractSnapshot(
    ownerId: string | null,
    value: AssetAssignmentFact['ownerContract'],
  ): Result<OwnerContractSnapshot | null, RentalCommitmentError> {
    if (value === null) return ok(null);

    const basis = Object.values(OwnerContractBasis).find((basis) => basis === value.basis);
    if (!basis) {
      return err(new RentalInvalidFieldError('basis', 'must be a valid owner contract basis'));
    }

    return OwnerContractSnapshot.create({
      ownerId: ownerId ?? '',
      contractId: value.contractId,
      ownerShare: value.ownerShare,
      rentalShare: value.rentalShare,
      basis,
    });
  }
}
