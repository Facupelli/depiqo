import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type {
  GetRentalsDateLensDto,
  GetRentalsResponseDto,
  GetRentalsSortByDto,
  GetRentalsSortDirectionDto,
} from '@repo/api-contracts';
import { Prisma } from 'src/generated/prisma/client';
import { V2FulfillmentMethod, V2RentalStatus } from 'src/generated/prisma/enums';

import { PrismaService } from 'src/core/database/prisma.service';

import { GetRentalsQuery } from './get-rentals.query';

type RawRentalRow = {
  id: string;
  rentalNumber: number;
  status: V2RentalStatus;
  fulfillmentMethod: V2FulfillmentMethod | null;
  createdAt: Date;
  pickupAt: Date;
  returnAt: Date;
  customerId: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerCompanyName: string | null;
  customerIsCompany: boolean | null;
  branchId: string;
};

type RawCountRow = {
  total: bigint | number;
};

const UPCOMING_EXCLUDED_STATUSES = [V2RentalStatus.COMPLETED, V2RentalStatus.CANCELLED] as const;

// Date lens filtering and sorting need a timezone for each joined branch, so a single
// A Tenant Management branch-context capability cannot compose this set-based read. This mirrors
// Tenant Management's authoritative trimmed branch -> tenant -> UTC resolution exactly.
const EFFECTIVE_TIMEZONE_SQL = Prisma.sql`COALESCE(NULLIF(BTRIM(b.timezone), ''), NULLIF(BTRIM(t.config->>'timezone'), ''), 'UTC')`;
const PICKUP_LOCAL_DATE_SQL = Prisma.sql`(r.period_start AT TIME ZONE ${EFFECTIVE_TIMEZONE_SQL})::date`;
const RETURN_LOCAL_DATE_SQL = Prisma.sql`(r.period_end AT TIME ZONE ${EFFECTIVE_TIMEZONE_SQL})::date`;
const TODAY_LOCAL_DATE_SQL = Prisma.sql`(CURRENT_TIMESTAMP AT TIME ZONE ${EFFECTIVE_TIMEZONE_SQL})::date`;

@QueryHandler(GetRentalsQuery)
export class GetRentalsHandler implements IQueryHandler<GetRentalsQuery, GetRentalsResponseDto> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetRentalsQuery): Promise<GetRentalsResponseDto> {
    const offset = (query.page - 1) * query.limit;
    const whereFilters = this.buildWhereFilters(query);
    const orderBy = this.buildOrderBy(query);

    const [rows, countRows] = await Promise.all([
      this.prisma.client.$queryRaw<RawRentalRow[]>(Prisma.sql`
        SELECT
          r.id AS "id",
          r.rental_number AS "rentalNumber",
          r.status AS "status",
          r.fulfillment_method AS "fulfillmentMethod",
          r.created_at AS "createdAt",
          r.period_start AS "pickupAt",
          r.period_end AS "returnAt",
          c.id AS "customerId",
          c.first_name AS "customerFirstName",
          c.last_name AS "customerLastName",
          c.company_name AS "customerCompanyName",
          c.is_company AS "customerIsCompany",
          r.branch_id AS "branchId"
        FROM v2_rentals r
        JOIN v2_branches b ON b.id = r.branch_id AND b.tenant_id = r.tenant_id
        JOIN v2_tenants t ON t.id = r.tenant_id
        LEFT JOIN v2_rental_customers c ON c.id = r.customer_id AND c.tenant_id = r.tenant_id AND c.deleted_at IS NULL
        WHERE ${Prisma.join(whereFilters, ' AND ')}
        ORDER BY ${orderBy}
        OFFSET ${offset}
        LIMIT ${query.limit}
      `),
      this.prisma.client.$queryRaw<RawCountRow[]>(Prisma.sql`
        SELECT COUNT(*) AS "total"
        FROM v2_rentals r
        JOIN v2_branches b ON b.id = r.branch_id AND b.tenant_id = r.tenant_id
        JOIN v2_tenants t ON t.id = r.tenant_id
        LEFT JOIN v2_rental_customers c ON c.id = r.customer_id AND c.tenant_id = r.tenant_id AND c.deleted_at IS NULL
        WHERE ${Prisma.join(whereFilters, ' AND ')}
      `),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        rentalNumber: row.rentalNumber,
        status: row.status,
        fulfillmentMethod: row.fulfillmentMethod,
        createdAt: row.createdAt.toISOString(),
        pickupAt: row.pickupAt.toISOString(),
        returnAt: row.returnAt.toISOString(),
        customer: row.customerId
          ? {
              id: row.customerId,
              displayName: this.resolveCustomerDisplayName(row),
              isCompany: row.customerIsCompany ?? false,
            }
          : null,
        branchId: row.branchId,
      })),
      total: Number(countRows[0]?.total ?? 0),
      page: query.page,
      limit: query.limit,
    };
  }

  private buildWhereFilters(query: GetRentalsQuery): Prisma.Sql[] {
    const filters: Prisma.Sql[] = [Prisma.sql`r.tenant_id = ${query.tenantId}`];

    if (query.branchId) {
      filters.push(Prisma.sql`r.branch_id = ${query.branchId}`);
    }

    if (query.customerId) {
      filters.push(Prisma.sql`r.customer_id = ${query.customerId}`);
    }

    if (query.statuses?.length) {
      filters.push(Prisma.sql`r.status IN (${Prisma.join(query.statuses)})`);
    }

    if (query.dateLens) {
      filters.push(this.buildDateLensFilter(query.dateLens));
    }

    return filters;
  }

  private buildDateLensFilter(dateLens: GetRentalsDateLensDto): Prisma.Sql {
    switch (dateLens) {
      case 'TODAY':
        return Prisma.sql`(${PICKUP_LOCAL_DATE_SQL} = ${TODAY_LOCAL_DATE_SQL} OR ${RETURN_LOCAL_DATE_SQL} = ${TODAY_LOCAL_DATE_SQL})`;
      case 'UPCOMING':
        return Prisma.sql`${PICKUP_LOCAL_DATE_SQL} >= ${TODAY_LOCAL_DATE_SQL} AND r.status NOT IN (${Prisma.join(UPCOMING_EXCLUDED_STATUSES)})`;
      case 'ACTIVE':
        return Prisma.sql`${PICKUP_LOCAL_DATE_SQL} <= ${TODAY_LOCAL_DATE_SQL} AND ${RETURN_LOCAL_DATE_SQL} >= ${TODAY_LOCAL_DATE_SQL}`;
      case 'PAST':
        return Prisma.sql`${RETURN_LOCAL_DATE_SQL} < ${TODAY_LOCAL_DATE_SQL}`;
      default:
        return Prisma.empty;
    }
  }

  private buildOrderBy(query: GetRentalsQuery): Prisma.Sql {
    const { sortBy, sortDirection } = this.resolveSort(query);
    const directionSql = sortDirection === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;

    switch (sortBy) {
      case 'pickupDate':
        return Prisma.sql`${PICKUP_LOCAL_DATE_SQL} ${directionSql}, r.period_start ${directionSql}, r.created_at DESC, r.id DESC`;
      case 'returnDate':
        return Prisma.sql`${RETURN_LOCAL_DATE_SQL} ${directionSql}, r.period_end ${directionSql}, r.created_at DESC, r.id DESC`;
      case 'createdAt':
      default:
        return Prisma.sql`r.created_at ${directionSql}, r.id ${directionSql}`;
    }
  }

  private resolveSort(query: GetRentalsQuery): {
    sortBy: GetRentalsSortByDto;
    sortDirection: GetRentalsSortDirectionDto;
  } {
    const fallback = this.getDefaultSort(query.dateLens);

    if (!query.sortBy && !query.sortDirection) {
      return fallback;
    }

    const sortBy = query.sortBy ?? fallback.sortBy;
    const sortDirection = query.sortDirection ?? this.getDefaultDirectionForSortBy(sortBy, query.dateLens);

    return { sortBy, sortDirection };
  }

  private getDefaultSort(dateLens?: GetRentalsDateLensDto): {
    sortBy: GetRentalsSortByDto;
    sortDirection: GetRentalsSortDirectionDto;
  } {
    switch (dateLens) {
      case 'UPCOMING':
        return { sortBy: 'pickupDate', sortDirection: 'asc' };
      case 'ACTIVE':
        return { sortBy: 'returnDate', sortDirection: 'asc' };
      case 'PAST':
        return { sortBy: 'returnDate', sortDirection: 'desc' };
      case 'TODAY':
      default:
        return { sortBy: 'createdAt', sortDirection: 'desc' };
    }
  }

  private getDefaultDirectionForSortBy(
    sortBy: GetRentalsSortByDto,
    dateLens?: GetRentalsDateLensDto,
  ): GetRentalsSortDirectionDto {
    if (sortBy === 'createdAt') {
      return 'desc';
    }

    if (sortBy === 'returnDate' && dateLens === 'PAST') {
      return 'desc';
    }

    return 'asc';
  }

  private resolveCustomerDisplayName(row: RawRentalRow): string {
    if (row.customerIsCompany && row.customerCompanyName) {
      return row.customerCompanyName;
    }

    return `${row.customerFirstName ?? ''} ${row.customerLastName ?? ''}`.trim();
  }
}
