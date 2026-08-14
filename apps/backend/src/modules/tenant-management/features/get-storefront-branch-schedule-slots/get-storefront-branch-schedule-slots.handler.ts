import type { BranchScheduleSlotDto, LocalDate } from '@repo/api-contracts';
import { resolveLocalDateTime } from '@repo/temporal';
import { V2BranchScheduleSlotType } from 'src/generated/prisma/client';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';
import { localDateDayOfWeek, localDateToPrismaDate, prismaDateToLocalDate } from 'src/core/temporal/local-date';

import { TenantConfig, TenantConfigProps } from '../../domain/value-objects/tenant-config.value-object';
import { resolveEffectiveTimezone } from '../../domain/utils/effective-timezone';
import { GetStorefrontBranchScheduleSlotsQuery } from './get-storefront-branch-schedule-slots.query';

export interface GetStorefrontBranchScheduleSlotsResult {
  pickupSlots?: BranchScheduleSlotDto[];
  returnSlots?: BranchScheduleSlotDto[];
}

interface BranchScheduleRow {
  specificDate: LocalDate | null;
  openTime: number;
  closeTime: number;
  slotIntervalMinutes: number | null;
}

@QueryHandler(GetStorefrontBranchScheduleSlotsQuery)
export class GetStorefrontBranchScheduleSlotsHandler implements IQueryHandler<
  GetStorefrontBranchScheduleSlotsQuery,
  GetStorefrontBranchScheduleSlotsResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetStorefrontBranchScheduleSlotsQuery): Promise<GetStorefrontBranchScheduleSlotsResult> {
    const result: GetStorefrontBranchScheduleSlotsResult = {};
    const timezone = await this.getEffectiveTimezone(query);

    if (!timezone) {
      if (query.periodStart !== undefined) result.pickupSlots = [];
      if (query.periodEnd !== undefined) result.returnSlots = [];
      return result;
    }

    if (query.periodStart !== undefined) {
      result.pickupSlots = await this.getSlots(query, query.periodStart, V2BranchScheduleSlotType.PICKUP, timezone);
    }

    if (query.periodEnd !== undefined) {
      result.returnSlots = await this.getSlots(query, query.periodEnd, V2BranchScheduleSlotType.RETURN, timezone);
    }

    return result;
  }

  private async getSlots(
    query: GetStorefrontBranchScheduleSlotsQuery,
    date: LocalDate,
    type: V2BranchScheduleSlotType,
    timezone: string,
  ): Promise<BranchScheduleSlotDto[]> {
    const dayOfWeek = localDateDayOfWeek(date);
    const specificDate = localDateToPrismaDate(date);

    const rows = await this.prisma.client.v2BranchSchedule.findMany({
      where: {
        branchId: query.branchId,
        branch: {
          tenantId: query.tenantId,
          deletedAt: null,
        },
        type,
        OR: [{ specificDate }, { dayOfWeek }],
      },
      select: {
        specificDate: true,
        openTime: true,
        closeTime: true,
        slotIntervalMinutes: true,
      },
    });

    return this.generateSlots(
      rows.map((row) => ({
        ...row,
        specificDate: row.specificDate ? prismaDateToLocalDate(row.specificDate) : null,
      })),
      date,
      timezone,
    );
  }

  private async getEffectiveTimezone(query: GetStorefrontBranchScheduleSlotsQuery): Promise<string | null> {
    const branch = await this.prisma.client.v2Branch.findFirst({
      where: {
        id: query.branchId,
        tenantId: query.tenantId,
        deletedAt: null,
      },
      select: {
        timezone: true,
        tenant: { select: { config: true } },
      },
    });

    if (!branch) return null;

    const tenantConfig = TenantConfig.reconstitute(branch.tenant.config as unknown as TenantConfigProps);
    return resolveEffectiveTimezone(branch.timezone, tenantConfig.timezone);
  }

  private generateSlots(rows: BranchScheduleRow[], date: LocalDate, timezone: string): BranchScheduleSlotDto[] {
    if (rows.length === 0) {
      return [];
    }

    const hasOverride = rows.some((row) => row.specificDate !== null);
    const applicableRows = hasOverride ? rows.filter((row) => row.specificDate !== null) : rows;

    const allSlots = applicableRows.flatMap((row) => {
      if (row.openTime === row.closeTime) {
        return [row.openTime];
      }

      if (row.slotIntervalMinutes === null) {
        return [];
      }

      const slots: number[] = [];
      for (let minute = row.openTime; minute < row.closeTime; minute += row.slotIntervalMinutes) {
        slots.push(minute);
      }

      return slots;
    });

    return [...new Set(allSlots)]
      .sort((a, b) => a - b)
      .flatMap((minuteOfDay) => {
        const resolution = resolveLocalDateTime({ localDate: date, minuteOfDay, timeZone: timezone });
        return resolution.kind === 'resolved' ? [{ minuteOfDay, instant: resolution.instant.toISOString() }] : [];
      });
  }
}
