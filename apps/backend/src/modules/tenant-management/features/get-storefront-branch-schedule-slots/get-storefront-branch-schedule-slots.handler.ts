import { V2BranchScheduleSlotType } from 'src/generated/prisma/client';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

import { GetStorefrontBranchScheduleSlotsQuery } from './get-storefront-branch-schedule-slots.query';

export interface GetStorefrontBranchScheduleSlotsResult {
  pickupSlots?: number[];
  returnSlots?: number[];
}

interface BranchScheduleRow {
  specificDate: Date | null;
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
    date: string,
    type: V2BranchScheduleSlotType,
  ): Promise<number[]> {
    const dayOfWeek = this.dayOfWeek(date);
    const specificDate = new Date(`${date}T00:00:00.000Z`);

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

    return this.generateSlots(rows);
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

  private dayOfWeek(dateKey: string): number {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  }
}
