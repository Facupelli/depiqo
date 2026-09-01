import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { localDateToPrismaDate, prismaDateToLocalDate } from 'src/core/temporal/local-date';
import { toZonedDateTimeParts } from 'src/core/temporal/zoned-date-time-parts';

import { BranchFacts } from './branch-facts.public-api';
import {
  BranchScheduleEligibility,
  BranchScheduleEligibilityError,
  BranchScheduleEligibilityResult,
} from './branch-schedule-eligibility.public-api';
import { BranchScheduleWindow } from '../domain/value-objects/branch-schedule-window.value-object';

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

    const localDateTime = toZonedDateTimeParts(input.operationAt, branch.value.effectiveTimezone);
    const specificDate = localDateToPrismaDate(localDateTime.localDate);
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
}
