import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  type AssetOccupancySpanDto,
  type GetAssetAvailabilityTimelineResponseDto,
  TenantPermission,
} from '@repo/api-contracts';
import { addDaysToLocalDate, localDateStartInstant } from '@repo/temporal';
import { err, ok, type Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { AssetInventoryDisplayFacts } from 'src/modules/asset-inventory/public-api/asset-inventory-display-facts.public-api';
import { TenantAuthorization } from 'src/modules/tenant-management/authorization/tenant-authorization.public-api';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';

import type { GetAssetAvailabilityTimelineError } from './get-asset-availability-timeline.errors';
import { GetAssetAvailabilityTimelineQuery } from './get-asset-availability-timeline.query';

export type GetAssetAvailabilityTimelineResult = Result<
  GetAssetAvailabilityTimelineResponseDto,
  GetAssetAvailabilityTimelineError
>;

type RecordedAssetBlock = {
  blockId: string;
  assetId: string;
  startsAtMs: number;
  endsAtMs: number;
  participationStartMs: number | null;
  participationEndMs: number | null;
  rentalId: string | null;
  rentalNumber: number | null;
  reason: string | null;
};

type TimelineWindow = { startsAtMs: number; endsAtMs: number };

@QueryHandler(GetAssetAvailabilityTimelineQuery)
export class GetAssetAvailabilityTimelineHandler implements IQueryHandler<
  GetAssetAvailabilityTimelineQuery,
  GetAssetAvailabilityTimelineResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: AssetInventoryDisplayFacts,
    private readonly branches: BranchFacts,
    private readonly authorization: TenantAuthorization,
  ) {}

  async execute({ props }: GetAssetAvailabilityTimelineQuery): Promise<GetAssetAvailabilityTimelineResult> {
    const { tenantId, tenantUserId, branchId, from, to, page, pageSize, assetIds, equipmentTypeIds } = props;
    const branch = await this.branches.getBranchFacts({ tenantId, branchId });
    const context = { useCase: 'GetAssetAvailabilityTimeline', tenantId, branchId };
    if (branch.isErr()) {
      return err({
        code:
          branch.error.code === 'BranchNotFound'
            ? 'rental_commitment.branch_not_found'
            : 'rental_commitment.tenant_config_invalid',
        message: branch.error.message,
        context,
        cause: branch.error,
      });
    }
    if (branch.value.isDeleted) {
      return err({ code: 'rental_commitment.branch_not_found', message: 'The requested branch was deleted.', context });
    }

    const timezone = branch.value.effectiveTimezone;
    const window = {
      startsAtMs: localDateStartInstant(from, timezone).getTime(),
      endsAtMs: localDateStartInstant(addDaysToLocalDate(to, 1), timezone).getTime(),
    };
    const [{ data: units, total }, permission] = await Promise.all([
      this.inventory.listBranchAssetDisplayFacts({ tenantId, branchId, equipmentTypeIds, assetIds, page, pageSize }),
      this.authorization.hasPermission({ tenantId, tenantUserId }, TenantPermission.RentalsRead),
    ]);
    if (permission.isErr() && permission.error.code === 'TenantAuthorizationStateInvalid') {
      throw new Error(permission.error.message, { cause: permission.error.cause });
    }
    const showRentalReferences = permission.isOk() && permission.value;
    const blocks = await this.findBlocks(
      tenantId,
      units.map((unit) => unit.assetId),
      window,
    );
    const spansByAsset = new Map<string, AssetOccupancySpanDto[]>();
    for (const block of blocks) {
      const spans = spansByAsset.get(block.assetId) ?? [];
      spans.push(...toVisibleSpans(block, window, showRentalReferences));
      spansByAsset.set(block.assetId, spans);
    }

    return ok({
      branchId,
      timezone,
      window: { startsAt: iso(window.startsAtMs), endsAt: iso(window.endsAtMs) },
      data: units.map(({ assetId, serialNumber, status, equipmentType }) => ({
        assetId,
        serialNumber,
        status,
        equipmentType: { id: equipmentType.id, name: equipmentType.name },
        spans: spansByAsset.get(assetId) ?? [],
      })),
      total,
      page,
      pageSize,
    });
  }

  private async findBlocks(
    tenantId: string,
    assetIds: string[],
    window: TimelineWindow,
  ): Promise<RecordedAssetBlock[]> {
    if (assetIds.length === 0 || window.startsAtMs >= window.endsAtMs) return [];

    return this.prisma.client.$queryRaw<RecordedAssetBlock[]>(Prisma.sql`
      SELECT
        b.id AS "blockId",
        b.asset_id AS "assetId",
        (EXTRACT(EPOCH FROM lower(b.period)) * 1000)::double precision AS "startsAtMs",
        (EXTRACT(EPOCH FROM upper(b.period)) * 1000)::double precision AS "endsAtMs",
        (EXTRACT(EPOCH FROM CASE b.block_type
          WHEN 'EQUIPMENT' THEN participation.starts_at
          WHEN 'ACCESSORY' THEN greatest(lower(b.period), r.period_start)
        END) * 1000)::double precision AS "participationStartMs",
        (EXTRACT(EPOCH FROM CASE b.block_type
          WHEN 'EQUIPMENT' THEN participation.ends_at
          WHEN 'ACCESSORY' THEN r.period_end
        END) * 1000)::double precision AS "participationEndMs",
        r.id AS "rentalId",
        r.rental_number AS "rentalNumber",
        b.unavailability_reason AS "reason"
      FROM v2_asset_blocks b
      LEFT JOIN v2_rentals r ON r.tenant_id = b.tenant_id AND r.id = b.rental_id
      LEFT JOIN LATERAL (
        SELECT
          min(a.effective_from) AS starts_at,
          min(coalesce(a.effective_until, r.period_end)) AS ends_at
        FROM v2_assigned_assets a
        WHERE b.block_type = 'EQUIPMENT'
          AND a.tenant_id = b.tenant_id AND a.rental_id = b.rental_id AND a.asset_id = b.asset_id
          AND a.effective_from >= lower(b.period)
          AND coalesce(a.effective_until, r.period_end) <= upper(b.period)
          AND a.effective_from < coalesce(a.effective_until, r.period_end)
        HAVING count(*) = 1
      ) participation ON true
      WHERE b.tenant_id = ${tenantId}
        AND b.asset_id IN (${Prisma.join(assetIds)})
        AND b.released_at IS NULL
        AND b.period && tstzrange(
          to_timestamp(${window.startsAtMs}::double precision / 1000),
          to_timestamp(${window.endsAtMs}::double precision / 1000), '[)'
        )
      ORDER BY b.asset_id, lower(b.period), b.id
    `);
  }
}

function iso(instantMs: number): string {
  return new Date(instantMs).toISOString();
}

function toVisibleSpans(
  block: RecordedAssetBlock,
  window: TimelineWindow,
  showRentalReferences: boolean,
): AssetOccupancySpanDto[] {
  const { blockId, startsAtMs, endsAtMs, participationStartMs, participationEndMs, reason } = block;
  const bounds = (start: number, end: number) => ({ blockId, startsAt: iso(start), endsAt: iso(end) });
  if (reason !== null) {
    return [{ kind: 'TEMPORARY_UNAVAILABILITY', ...bounds(startsAtMs, endsAtMs), reason }];
  }

  const rental =
    showRentalReferences && block.rentalId !== null && block.rentalNumber !== null
      ? { id: block.rentalId, rentalNumber: block.rentalNumber }
      : null;
  if (
    participationStartMs === null ||
    participationEndMs === null ||
    participationStartMs < startsAtMs ||
    participationEndMs > endsAtMs ||
    participationStartMs >= participationEndMs
  ) {
    return [{ kind: 'RENTAL_OCCUPANCY', ...bounds(startsAtMs, endsAtMs), rental }];
  }

  const portions = [
    { kind: 'OPERATIONAL_BUFFER', start: startsAtMs, end: participationStartMs },
    { kind: 'RESERVATION', start: participationStartMs, end: participationEndMs },
    { kind: 'OPERATIONAL_BUFFER', start: participationEndMs, end: endsAtMs },
  ] as const;
  return portions
    .filter(({ start, end }) => start < end && start < window.endsAtMs && end > window.startsAtMs)
    .map(({ kind, start, end }) => ({ kind, ...bounds(start, end), rental }));
}
