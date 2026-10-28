import type { ReportPeriodDto, ReportRentalStatusDto } from '@repo/api-contracts';

import { Prisma } from 'src/generated/prisma/client';

export function getReportingPeriod(year: number, month: number | undefined, timezone: string): ReportPeriodDto {
  if (typeof timezone !== 'string' || timezone.length === 0) {
    throw new Error('Tenant reporting timezone is missing.');
  }
  Intl.DateTimeFormat(undefined, { timeZone: timezone });

  const yearKey = String(year).padStart(4, '0');
  const nextYearKey = String(year + 1).padStart(4, '0');
  const from = `${yearKey}-${String(month ?? 1).padStart(2, '0')}-01`;
  const until =
    month === undefined || month === 12
      ? `${nextYearKey}-01-01`
      : `${yearKey}-${String(month + 1).padStart(2, '0')}-01`;

  return { timezone, from, until };
}

interface ReportingPopulation {
  tenantId: string;
  branchId: string | undefined;
  statuses: readonly ReportRentalStatusDto[];
}

export function rentalEligibilitySql(population: ReportingPopulation, period: ReportPeriodDto): Prisma.Sql {
  if (population.statuses.length === 0) throw new Error('Reporting requires at least one eligible status.');

  const statuses = Prisma.join(population.statuses.map((status) => Prisma.sql`${status}::"V2RentalStatus"`));
  return Prisma.sql`
    r.tenant_id = ${population.tenantId}
    AND r.status IN (${statuses})
    AND (r.status <> 'CANCELLED' OR r.confirmed_at IS NOT NULL)
    AND r.period_start >= (${period.from}::date::timestamp AT TIME ZONE ${period.timezone})
    AND r.period_start < (${period.until}::date::timestamp AT TIME ZONE ${period.timezone})
    ${population.branchId === undefined ? Prisma.empty : Prisma.sql`AND r.branch_id = ${population.branchId}`}
  `;
}

export function toReportCount(value: bigint | string): number {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error('Report count is outside the safe nonnegative integer range.');
  }
  return count;
}
