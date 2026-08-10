import type { LocalDate } from '@repo/api-contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from 'src/generated/prisma/client';
import { V2RentalStatus } from 'src/generated/prisma/enums';

import { PrismaService } from 'src/core/database/prisma.service';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';

import { GetRentalsCalendarQuery } from './get-rentals-calendar.query';

const RENTAL_CALENDAR_STATUSES = [
  V2RentalStatus.PENDING,
  V2RentalStatus.DRAFT,
  V2RentalStatus.CONFIRMED,
  V2RentalStatus.PREPARED,
] as const;

type RentalCalendarStatus = (typeof RENTAL_CALENDAR_STATUSES)[number];

export interface RentalsCalendarCustomerReadModel {
  id: string;
  displayName: string;
  isCompany: boolean;
}

export interface RentalsCalendarItemReadModel {
  id: string;
  number: string;
  status: RentalCalendarStatus;
  createdAt: string;
  pickupAt: string;
  returnAt: string;
  pickupDate: LocalDate;
  returnDate: LocalDate;
  customer: RentalsCalendarCustomerReadModel | null;
}

export type GetRentalsCalendarResult = RentalsCalendarItemReadModel[];

type RawRentalCalendarRow = {
  id: string;
  status: RentalCalendarStatus;
  createdAt: string;
  periodStart: string;
  periodEnd: string;
  customerId: string | null;
};

@QueryHandler(GetRentalsCalendarQuery)
export class GetRentalsCalendarHandler implements IQueryHandler<GetRentalsCalendarQuery, GetRentalsCalendarResult> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantManagementApi: TenantManagementPublicApi,
  ) {}

  async execute(query: GetRentalsCalendarQuery): Promise<GetRentalsCalendarResult> {
    const timezone = await this.resolveCalendarTimezone(query.tenantId, query.branchId);

    // Calendar request dates are inclusive branch-local dates. Convert their half-open
    // [from midnight, day-after-to midnight) interval to absolute instants.
    const rangeStart = Prisma.sql`(${query.from}::date)::timestamp AT TIME ZONE ${timezone}`;
    const rangeEnd = Prisma.sql`(${query.to}::date + 1)::timestamp AT TIME ZONE ${timezone}`;

    const rentals = await this.prisma.client.$queryRaw<RawRentalCalendarRow[]>(Prisma.sql`
      SELECT
        r.id AS "id",
        r.status AS "status",
        -- Local PrismaPg raw-query adapter workaround: its TIMESTAMPTZ decoding is
        -- session-timezone-sensitive. Format canonical UTC API strings here. This
        -- does not reinterpret storage: TIMESTAMPTZ already represents the instant.
        to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
        to_char(r.period_start AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "periodStart",
        to_char(r.period_end AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "periodEnd",
        r.customer_id AS "customerId"
      FROM v2_rentals r
      WHERE r.tenant_id = ${query.tenantId}
        AND r.branch_id = ${query.branchId}
        AND r.status IN (${Prisma.join(RENTAL_CALENDAR_STATUSES)})
        AND r.period_start < ${rangeEnd}
        AND r.period_end > ${rangeStart}
      ORDER BY r.period_start ASC, r.period_end ASC, r.created_at DESC, r.id ASC
    `);

    const customersById = await this.getCustomersById(
      query.tenantId,
      rentals.map((rental) => rental.customerId).filter((customerId): customerId is string => customerId !== null),
    );

    return rentals.map((rental) => {
      const customer = rental.customerId ? (customersById.get(rental.customerId) ?? null) : null;
      const createdAt = new Date(rental.createdAt);
      const periodStart = new Date(rental.periodStart);
      const periodEnd = new Date(rental.periodEnd);

      return {
        id: rental.id,
        number: rental.id.slice(0, 4),
        status: rental.status as RentalCalendarStatus,
        createdAt: createdAt.toISOString(),
        pickupAt: periodStart.toISOString(),
        returnAt: periodEnd.toISOString(),
        pickupDate: this.toDateKey(periodStart, timezone),
        returnDate: this.toDateKey(periodEnd, timezone),
        customer,
      };
    });
  }

  private async resolveCalendarTimezone(tenantId: string, branchId: string): Promise<string> {
    const branchContext = await this.tenantManagementApi.getBranchContext({ tenantId, branchId });

    if (branchContext.isErr()) {
      throw new Error(branchContext.error.message, { cause: branchContext.error });
    }

    return branchContext.value.effectiveTimezone;
  }

  private async getCustomersById(
    tenantId: string,
    customerIds: readonly string[],
  ): Promise<Map<string, RentalsCalendarCustomerReadModel>> {
    const uniqueCustomerIds = [...new Set(customerIds)];

    if (uniqueCustomerIds.length === 0) {
      return new Map();
    }

    const customers = await this.prisma.client.v2RentalCustomer.findMany({
      where: {
        tenantId,
        id: { in: uniqueCustomerIds },
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        isCompany: true,
      },
    });

    return new Map(
      customers.map((customer) => [
        customer.id,
        {
          id: customer.id,
          displayName: this.resolveCustomerDisplayName(customer),
          isCompany: customer.isCompany,
        },
      ]),
    );
  }

  private resolveCustomerDisplayName(customer: {
    firstName: string;
    lastName: string;
    companyName: string | null;
    isCompany: boolean;
  }): string {
    if (customer.isCompany && customer.companyName) {
      return customer.companyName;
    }

    return `${customer.firstName} ${customer.lastName}`.trim();
  }

  private toDateKey(date: Date, timezone: string): LocalDate {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    return `${year}-${month}-${day}`;
  }
}
