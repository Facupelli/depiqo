import type { LocalDate } from '@repo/api-contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';
import { Prisma } from 'src/generated/prisma/client';
import { V2RentalStatus } from 'src/generated/prisma/enums';

import { PrismaService } from 'src/core/database/prisma.service';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { RentalCustomerIdentityFacts } from 'src/modules/tenant-management/public-api/rental-customer-identity-facts.public-api';

import { GetRentalsCalendarError, getRentalsCalendarError } from './get-rentals-calendar.errors';
import { GetRentalsCalendarQuery } from './get-rentals-calendar.query';

const RENTAL_CALENDAR_STATUSES = [V2RentalStatus.PENDING, V2RentalStatus.DRAFT, V2RentalStatus.CONFIRMED] as const;

type RentalCalendarStatus = (typeof RENTAL_CALENDAR_STATUSES)[number];

export interface RentalsCalendarCustomerReadModel {
  id: string;
  displayName: string;
  isCompany: boolean;
}

export interface RentalsCalendarItemReadModel {
  id: string;
  rentalNumber: number;
  status: RentalCalendarStatus;
  createdAt: string;
  pickupAt: string;
  returnAt: string;
  pickupDate: LocalDate;
  returnDate: LocalDate;
  customer: RentalsCalendarCustomerReadModel | null;
}

export type GetRentalsCalendarResult = Result<RentalsCalendarItemReadModel[], GetRentalsCalendarError>;

type RawRentalCalendarRow = {
  id: string;
  rentalNumber: number;
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
    private readonly tenantManagementApi: BranchFacts,
    private readonly rentalCustomerIdentityFacts: RentalCustomerIdentityFacts,
  ) {}

  async execute(query: GetRentalsCalendarQuery): Promise<GetRentalsCalendarResult> {
    const timezoneResult = await this.resolveCalendarTimezone(query.tenantId, query.branchId);
    if (timezoneResult.isErr()) return err(timezoneResult.error);
    const timezone = timezoneResult.value;

    // Calendar request dates are inclusive branch-local dates. Convert their half-open
    // [from midnight, day-after-to midnight) interval to absolute instants.
    const rangeStart = Prisma.sql`(${query.from}::date)::timestamp AT TIME ZONE ${timezone}`;
    const rangeEnd = Prisma.sql`(${query.to}::date + 1)::timestamp AT TIME ZONE ${timezone}`;

    const rentals = await this.prisma.client.$queryRaw<RawRentalCalendarRow[]>(Prisma.sql`
      SELECT
        r.id AS "id",
        r.rental_number AS "rentalNumber",
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

    const customerFacts = await this.rentalCustomerIdentityFacts.getRentalCustomerIdentityFactsBatch({
      tenantId: query.tenantId,
      rentalCustomerIds: rentals
        .map((rental) => rental.customerId)
        .filter((customerId): customerId is string => customerId !== null),
    });
    const customersById = new Map(
      customerFacts.map((customer) => [
        customer.rentalCustomerId,
        {
          id: customer.rentalCustomerId,
          displayName: customer.displayName,
          isCompany: customer.isCompany,
        },
      ]),
    );

    const items = rentals.map((rental) => {
      const customer = rental.customerId ? (customersById.get(rental.customerId) ?? null) : null;
      const createdAt = new Date(rental.createdAt);
      const periodStart = new Date(rental.periodStart);
      const periodEnd = new Date(rental.periodEnd);

      // SAFETY: The value originates from the constrained persistence or validated request field represented by this closed domain type.
      return {
        id: rental.id,
        rentalNumber: rental.rentalNumber,
        status: rental.status as RentalCalendarStatus,
        createdAt: createdAt.toISOString(),
        pickupAt: periodStart.toISOString(),
        returnAt: periodEnd.toISOString(),
        pickupDate: this.toDateKey(periodStart, timezone),
        returnDate: this.toDateKey(periodEnd, timezone),
        customer,
      };
    });

    return ok(items);
  }

  private async resolveCalendarTimezone(
    tenantId: string,
    branchId: string,
  ): Promise<Result<string, GetRentalsCalendarError>> {
    const branchContext = await this.tenantManagementApi.getBranchFacts({ tenantId, branchId });

    if (branchContext.isErr()) {
      const context = { useCase: 'GetRentalsCalendar', tenantId, branchId };
      switch (branchContext.error.code) {
        case 'BranchNotFound':
          return err(
            getRentalsCalendarError(
              'rental_commitment.branch_not_found',
              branchContext.error.message,
              branchContext.error,
              context,
            ),
          );
        case 'TenantConfigurationInvalid':
          return err(
            getRentalsCalendarError(
              'rental_commitment.tenant_config_invalid',
              branchContext.error.message,
              branchContext.error,
              context,
            ),
          );
        default:
          throw new Error('Unexpected branch facts failure.', { cause: branchContext.error });
      }
    }

    return ok(branchContext.value.effectiveTimezone);
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
