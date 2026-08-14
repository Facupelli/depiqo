import type { LocalDate } from '@repo/api-contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';
import { prismaDateToLocalDate } from 'src/core/temporal/local-date';

import { GetStorefrontBranchSchedulesQuery } from './get-storefront-branch-schedules.query';

export interface GetStorefrontBranchScheduleReadModel {
  id: string;
  branchId: string;
  type: 'PICKUP' | 'RETURN';
  dayOfWeek: number | null;
  specificDate: LocalDate | null;
  openTime: number;
  closeTime: number;
  slotIntervalMinutes: number | null;
}

export type GetStorefrontBranchSchedulesResult = GetStorefrontBranchScheduleReadModel[];

@QueryHandler(GetStorefrontBranchSchedulesQuery)
export class GetStorefrontBranchSchedulesHandler implements IQueryHandler<
  GetStorefrontBranchSchedulesQuery,
  GetStorefrontBranchSchedulesResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetStorefrontBranchSchedulesQuery): Promise<GetStorefrontBranchSchedulesResult> {
    const schedules = await this.prisma.client.v2BranchSchedule.findMany({
      where: {
        branchId: query.branchId,
        branch: {
          tenantId: query.tenantId,
          deletedAt: null,
          isActive: true,
        },
      },
      select: {
        id: true,
        branchId: true,
        type: true,
        dayOfWeek: true,
        specificDate: true,
        openTime: true,
        closeTime: true,
        slotIntervalMinutes: true,
      },
      orderBy: [{ type: 'asc' }, { dayOfWeek: 'asc' }, { specificDate: 'asc' }, { openTime: 'asc' }],
    });

    return schedules.map((schedule) => ({
      id: schedule.id,
      branchId: schedule.branchId,
      type: schedule.type,
      dayOfWeek: schedule.dayOfWeek,
      specificDate: schedule.specificDate ? prismaDateToLocalDate(schedule.specificDate) : null,
      openTime: schedule.openTime,
      closeTime: schedule.closeTime,
      slotIntervalMinutes: schedule.slotIntervalMinutes,
    }));
  }
}
