import type { LocalDate } from '@repo/api-contracts';
import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { localDateDayOfWeek, localDateToPrismaDate, prismaDateToLocalDate } from 'src/core/temporal/local-date';

import { BranchFacts } from './branch-facts.public-api';
import {
  BranchScheduleEligibility,
  BranchScheduleEligibilityError,
  BranchScheduleEligibilityResult,
} from './branch-schedule-eligibility.public-api';
import { BranchScheduleWindow } from '../domain/value-objects/branch-schedule-window.value-object';

type LocalDateTimeParts = { dateKey: LocalDate; dayOfWeek: number; minuteOfDay: number };

@Injectable()
export class BranchScheduleEligibilityService extends BranchScheduleEligibility {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchFacts: BranchFacts,
  ) {
    super();
  }

  async evaluateBranchScheduleEligibility(input: {
    tenantId: string;
    branchId: string;
    operation: 'PICKUP' | 'RETURN';
    operationAt: Date;
  }): Promise<Result<BranchScheduleEligibilityResult, BranchScheduleEligibilityError>> {
    const branch = await this.branchFacts.getBranchFacts({ tenantId: input.tenantId, branchId: input.branchId });
    if (branch.isErr()) return err(branch.error);

    const localDateTime = this.toLocalDateTimeParts(input.operationAt, branch.value.effectiveTimezone);
    const specificDate = localDateToPrismaDate(localDateTime.dateKey);
    const rawRows = await this.prisma.client.v2BranchSchedule.findMany({
      where: {
        branchId: input.branchId,
        type: input.operation,
        OR: [{ specificDate }, { dayOfWeek: localDateTime.dayOfWeek }],
      },
      select: { specificDate: true, openTime: true, closeTime: true },
    });

    const rows = rawRows.map((row) => ({
      ...row,
      specificDate: row.specificDate ? prismaDateToLocalDate(row.specificDate) : null,
    }));
    const applicableRows = rows.some((row) => row.specificDate !== null)
      ? rows.filter((row) => row.specificDate !== null)
      : rows;

    return ok({
      eligible: applicableRows.some((row) =>
        BranchScheduleWindow.reconstitute({
          openTime: row.openTime,
          closeTime: row.closeTime,
          slotIntervalMinutes: null,
        }).containsMinute(localDateTime.minuteOfDay),
      ),
    });
  }

  private toLocalDateTimeParts(date: Date, timezone: string): LocalDateTimeParts {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const get = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? '0');
    const hour = get('hour') === 24 ? 0 : get('hour');
    const dateKey = `${String(get('year')).padStart(4, '0')}-${String(get('month')).padStart(2, '0')}-${String(get('day')).padStart(2, '0')}` as LocalDate;

    return { dateKey, dayOfWeek: localDateDayOfWeek(dateKey), minuteOfDay: hour * 60 + get('minute') };
  }
}
