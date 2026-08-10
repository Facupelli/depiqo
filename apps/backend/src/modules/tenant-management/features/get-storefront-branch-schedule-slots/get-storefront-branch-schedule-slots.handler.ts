import type { LocalDate } from '@repo/api-contracts';
import { V2BranchScheduleSlotType } from 'src/generated/prisma/client';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';
import { localDateDayOfWeek, localDateToPrismaDate, prismaDateToLocalDate } from 'src/core/temporal/local-date';

import { GetStorefrontBranchScheduleSlotsQuery } from './get-storefront-branch-schedule-slots.query';

export interface GetStorefrontBranchScheduleSlotsResult {
  pickupSlots?: number[];
  returnSlots?: number[];
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

    if (query.periodStart !== undefined) {
      result.pickupSlots = await this.getSlots(query, query.periodStart, V2BranchScheduleSlotType.PICKUP);
    }

    if (query.periodEnd !== undefined) {
      result.returnSlots = await this.getSlots(query, query.periodEnd, V2BranchScheduleSlotType.RETURN);
    }

    return result;
  }

  private async getSlots(
    query: GetStorefrontBranchScheduleSlotsQuery,
    date: LocalDate,
    type: V2BranchScheduleSlotType,
  ): Promise<number[]> {
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
    );
  }

  private generateSlots(rows: BranchScheduleRow[]): number[] {
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

    return [...new Set(allSlots)].sort((a, b) => a - b);
  }
}
