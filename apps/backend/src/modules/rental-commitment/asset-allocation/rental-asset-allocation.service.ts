import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';
import { Prisma } from 'src/generated/prisma/client';
import { V2AssetBlockType } from 'src/generated/prisma/enums';

import {
  OverlappingReservedAsset,
  RentalAssetAllocationDemandLine,
  RentalAssetAllocationPlan,
  RentalAssetAllocationPolicy,
} from './rental-asset-allocation-policy';
import { AssetCandidate, RentalAssetCandidateStatus, RentalAssetOwnershipKind } from './asset-candidate.projection';
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

@Injectable()
export class RentalAssetAllocationService {
  private readonly allocationPolicy = new RentalAssetAllocationPolicy();

  constructor(private readonly prisma: PrismaService) {}

  async findEligibleAvailableCandidates(params: {
    tenantId: string;
    branchId: string;
    equipmentTypeIds: readonly EquipmentTypeId[];
    periodStart: Date;
    periodEnd: Date;
    excludeAssetIds?: readonly AssetId[];
  }): Promise<Result<AssetCandidate[], RentalCommitmentError>> {
    const candidates = await this.findAssetCandidates({
      tenantId: params.tenantId,
      branchId: params.branchId,
      equipmentTypeIds: params.equipmentTypeIds,
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
      tx: params.tx,
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
    tx?: PrismaTransactionClient;
  }): Promise<Result<AssetCandidate[], RentalCommitmentError>> {
    const db = params.tx ?? this.prisma.client;
    const rows = await db.v2RentalAssetCandidate.findMany({
      where: {
        tenantId: params.tenantId,
        branchId: params.branchId,
        equipmentTypeId: { in: [...params.equipmentTypeIds] },
      },
    });

    const candidates: AssetCandidate[] = [];

    for (const row of rows) {
      const ownershipKind = this.mapOwnershipKind(row.ownershipKind);
      if (!ownershipKind) {
        return err(new RentalInvalidFieldError('ownershipKind', `unsupported value "${row.ownershipKind}"`));
      }

      const assetStatus = this.mapAssetStatus(row.assetStatus);
      if (!assetStatus) {
        return err(new RentalInvalidFieldError('assetStatus', `unsupported value "${row.assetStatus}"`));
      }

      const ownerContractSnapshot = this.mapOwnerContractSnapshot(row.ownerContractSnapshot);
      if (ownerContractSnapshot.isErr()) {
        return err(ownerContractSnapshot.error);
      }

      candidates.push({
        tenantId: row.tenantId,
        assetId: row.assetId as AssetId,
        branchId: row.branchId,
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
    ignoredBlockScope?: {
      rentalId: string;
      blockType: V2AssetBlockType;
    };
    tx?: PrismaTransactionClient;
  }): Promise<OverlappingReservedAsset[]> {
    if (params.assetIds.length === 0) {
      return [];
    }

    const period = new RentalPeriod(params.periodStart, params.periodEnd).toPostgresRange();

    const assetIds = params.assetIds.map(String);

    const ignoredBlockScopeSql = params.ignoredBlockScope
      ? Prisma.sql`
        AND NOT (
          rental_id = ${params.ignoredBlockScope.rentalId}
          AND block_type = ${params.ignoredBlockScope.blockType}::"V2AssetBlockType"
        )
      `
      : Prisma.empty;

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

    return rows.map((row) => ({ assetId: row.assetId as AssetId }));
  }

  private mapOwnershipKind(value: string): RentalAssetOwnershipKind | undefined {
    return Object.values(RentalAssetOwnershipKind).find((kind) => kind === value);
  }

  private mapAssetStatus(value: string): RentalAssetCandidateStatus | undefined {
    return Object.values(RentalAssetCandidateStatus).find((status) => status === value);
  }

  private mapOwnerContractSnapshot(
    value: Prisma.JsonValue,
  ): Result<OwnerContractSnapshot | null, RentalCommitmentError> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return value === null ? ok(null) : err(new RentalInvalidFieldError('ownerContractSnapshot', 'must be an object'));
    }

    const basis = value.basis;
    if (basis !== OwnerContractBasis.Gross && basis !== OwnerContractBasis.Net) {
      return err(new RentalInvalidFieldError('basis', 'must be a valid owner contract basis'));
    }

    return OwnerContractSnapshot.create({
      ownerId: typeof value.ownerId === 'string' ? value.ownerId : '',
      contractId: typeof value.contractId === 'string' ? value.contractId : '',
      ownerShare: Number(value.ownerShare),
      rentalShare: Number(value.rentalShare),
      basis,
    });
  }
}
