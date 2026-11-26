import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { PrismaService } from 'src/core/database/prisma.service';
import { mapPostgresError, PostgresExclusionViolationError } from 'src/core/utils/postgres-error.mapper';
import { Prisma } from 'src/generated/prisma/client';
import { AssetInventoryDisplayFacts } from 'src/modules/asset-inventory/public-api/asset-inventory-display-facts.public-api';

import {
  AssetUnavailability,
  cancelUnavailability,
  rescheduleUnavailability,
  scheduleUnavailability,
  UnavailabilityWindow,
} from '../../domain/asset-unavailability';
import { AssetUnavailabilityError, assetUnavailabilityError } from './asset-unavailability.errors';

interface AssetScope {
  tenantId: string;
  assetId: string;
}

interface PeriodScope extends AssetScope {
  periodId: string;
}

export class ListAssetUnavailabilityQuery {
  constructor(readonly asset: AssetScope) {}
}

export class ScheduleAssetUnavailabilityCommand {
  constructor(
    readonly asset: AssetScope,
    readonly window: Omit<UnavailabilityWindow, 'startsAt'> & { startsAt?: Date },
  ) {}
}

export class RescheduleAssetUnavailabilityCommand {
  constructor(
    readonly period: PeriodScope,
    readonly window: UnavailabilityWindow,
  ) {}
}

export class CancelAssetUnavailabilityCommand {
  constructor(readonly period: PeriodScope) {}
}

export type AssetUnavailabilityResult<T> = Result<T, AssetUnavailabilityError>;

export interface AssetUnavailabilityReadModel extends AssetUnavailability {
  id: string;
  createdAt: Date;
}

const windowColumns = Prisma.sql`
  lower(period) AS "startsAt", upper(period) AS "endsAt", unavailability_reason AS reason,
  released_at AS "cancelledAt"
`;

function scopeSql({ tenantId, assetId }: AssetScope) {
  return Prisma.sql`
    tenant_id = ${tenantId} AND asset_id = ${assetId}
    AND block_type = 'TEMPORARY_UNAVAILABILITY'::"V2AssetBlockType"
  `;
}

async function assetExists(inventory: AssetInventoryDisplayFacts, asset: AssetScope): Promise<boolean> {
  const matches = await inventory.getAssetDisplayFacts({ tenantId: asset.tenantId, assetIds: [asset.assetId] });
  return matches.length > 0;
}

@QueryHandler(ListAssetUnavailabilityQuery)
export class ListAssetUnavailabilityHandler implements IQueryHandler<
  ListAssetUnavailabilityQuery,
  AssetUnavailabilityResult<AssetUnavailabilityReadModel[]>
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: AssetInventoryDisplayFacts,
  ) {}

  async execute({ asset }: ListAssetUnavailabilityQuery) {
    if (!(await assetExists(this.inventory, asset)))
      return err(assetUnavailabilityError('asset_inventory.asset_not_found'));
    return ok(
      await this.prisma.client.$queryRaw<AssetUnavailabilityReadModel[]>`
      SELECT id, created_at AS "createdAt", ${windowColumns}
      FROM v2_asset_blocks
      WHERE ${scopeSql(asset)}
      ORDER BY lower(period) DESC, id
    `,
    );
  }
}

@CommandHandler(ScheduleAssetUnavailabilityCommand)
export class ScheduleAssetUnavailabilityHandler implements ICommandHandler<
  ScheduleAssetUnavailabilityCommand,
  AssetUnavailabilityResult<{ id: string }>
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: AssetInventoryDisplayFacts,
  ) {}

  async execute({ asset, window }: ScheduleAssetUnavailabilityCommand) {
    if (!(await assetExists(this.inventory, asset)))
      return err(assetUnavailabilityError('asset_inventory.asset_not_found'));

    const now = new Date();
    const planned = scheduleUnavailability({ ...window, startsAt: window.startsAt ?? now }, now);
    if (planned.isErr()) return err(assetUnavailabilityError('asset_unavailability.invalid_window'));

    return mapOverlap(async () => {
      const id = randomUUID();
      await this.prisma.client.$executeRaw`
        INSERT INTO v2_asset_blocks (id, tenant_id, asset_id, block_type, period, unavailability_reason, created_at)
        VALUES (${id}, ${asset.tenantId}, ${asset.assetId}, 'TEMPORARY_UNAVAILABILITY',
          ${rangeSql(planned.value)}, ${planned.value.reason}, ${now})
      `;
      return ok({ id });
    });
  }
}

type ChangeWindow = (
  current: AssetUnavailability,
  now: Date,
) => Result<AssetUnavailability, 'invalid_window' | 'not_editable'>;

@Injectable()
export class ChangeAssetUnavailability {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {}

  async execute(period: PeriodScope, change: ChangeWindow): Promise<AssetUnavailabilityResult<void>> {
    const predicate = Prisma.sql`${scopeSql(period)} AND id = ${period.periodId}`;
    return mapOverlap(() =>
      this.unitOfWork.runResultInTransaction(async ({ tx }) => {
        const [current] = await tx.$queryRaw<AssetUnavailability[]>`
        SELECT ${windowColumns} FROM v2_asset_blocks WHERE ${predicate} FOR UPDATE
      `;
        if (!current) return err(assetUnavailabilityError('asset_unavailability.period_not_found'));

        const next = change(current, new Date());
        if (next.isErr()) return err(assetUnavailabilityError(`asset_unavailability.${next.error}`));
        if (next.value === current) return ok(undefined);

        await tx.$executeRaw`
        UPDATE v2_asset_blocks
        SET period = ${rangeSql(next.value)}, unavailability_reason = ${next.value.reason},
          released_at = ${next.value.cancelledAt}
        WHERE ${predicate}
      `;
        return ok(undefined);
      }),
    );
  }
}

@CommandHandler(RescheduleAssetUnavailabilityCommand)
export class RescheduleAssetUnavailabilityHandler implements ICommandHandler<
  RescheduleAssetUnavailabilityCommand,
  AssetUnavailabilityResult<void>
> {
  constructor(private readonly change: ChangeAssetUnavailability) {}

  execute({ period, window }: RescheduleAssetUnavailabilityCommand) {
    return this.change.execute(period, (current, now) => rescheduleUnavailability(current, window, now));
  }
}

@CommandHandler(CancelAssetUnavailabilityCommand)
export class CancelAssetUnavailabilityHandler implements ICommandHandler<
  CancelAssetUnavailabilityCommand,
  AssetUnavailabilityResult<void>
> {
  constructor(private readonly change: ChangeAssetUnavailability) {}

  execute({ period }: CancelAssetUnavailabilityCommand) {
    return this.change.execute(period, cancelUnavailability);
  }
}

function rangeSql({ startsAt, endsAt }: UnavailabilityWindow) {
  return Prisma.sql`tstzrange(${startsAt.toISOString()}::timestamptz, ${endsAt.toISOString()}::timestamptz, '[)')`;
}

async function mapOverlap<T>(work: () => Promise<AssetUnavailabilityResult<T>>): Promise<AssetUnavailabilityResult<T>> {
  try {
    return await work().catch(mapPostgresError);
  } catch (error) {
    if (error instanceof PostgresExclusionViolationError) {
      return err(assetUnavailabilityError('asset_unavailability.overlap', error));
    }
    throw error;
  }
}
