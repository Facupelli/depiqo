import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { OrderStatus } from '@repo/types';
import { Prisma } from 'src/generated/prisma/client';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  GetLocationContextQuery,
  LocationContextReadModel,
} from 'src/modules/tenant/public/queries/get-location-context.query';

import { GetOrdersCalendarQuery } from './get-orders-calendar.query';
import { GetOrdersCalendarResponseDto } from './get-orders-calendar.response.dto';

type RawOrderCalendarRow = {
  id: string;
  number: number;
  status: OrderStatus.CONFIRMED | OrderStatus.ACTIVE;
  pickupAt: Date;
  returnAt: Date;
  pickupDate: string;
  returnDate: string;
  customerId: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerCompanyName: string | null;
  customerIsCompany: boolean | null;
};

const ORDER_CALENDAR_STATUSES = [OrderStatus.CONFIRMED, OrderStatus.ACTIVE] as const;

@QueryHandler(GetOrdersCalendarQuery)
export class GetOrdersCalendarQueryHandler implements IQueryHandler<
  GetOrdersCalendarQuery,
  GetOrdersCalendarResponseDto
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(query: GetOrdersCalendarQuery): Promise<GetOrdersCalendarResponseDto> {
    const locationContext = await this.queryBus.execute<GetLocationContextQuery, LocationContextReadModel | null>(
      new GetLocationContextQuery(query.tenantId, query.locationId),
    );

    if (!locationContext) {
      throw new Error(`Location context not found for location "${query.locationId}"`);
    }

    const rows = await this.prisma.client.$queryRaw<RawOrderCalendarRow[]>(Prisma.sql`
      SELECT
        o.id AS "id",
        o.order_number AS "number",
        o.status AS "status",
        o.period_start AS "pickupAt",
        o.period_end AS "returnAt",
        to_char(o.period_start AT TIME ZONE ${locationContext.effectiveTimezone}, 'YYYY-MM-DD') AS "pickupDate",
        to_char(o.period_end AT TIME ZONE ${locationContext.effectiveTimezone}, 'YYYY-MM-DD') AS "returnDate",
        c.id AS "customerId",
        c.first_name AS "customerFirstName",
        c.last_name AS "customerLastName",
        c.company_name AS "customerCompanyName",
        c.is_company AS "customerIsCompany"
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE o.tenant_id = ${query.tenantId}
        AND o.location_id = ${query.locationId}
        AND o.deleted_at IS NULL
        AND o.status IN (${Prisma.join(ORDER_CALENDAR_STATUSES)})
        AND o.period_start < ${query.rangeEnd}::timestamptz
        AND o.period_end > ${query.rangeStart}::timestamptz
      ORDER BY o.period_start ASC, o.period_end ASC, o.created_at DESC, o.id ASC
    `);

    return {
      orders: rows.map((row) => ({
        id: row.id,
        number: row.number,
        status: row.status,
        pickupAt: row.pickupAt.toISOString(),
        returnAt: row.returnAt.toISOString(),
        pickupDate: row.pickupDate,
        returnDate: row.returnDate,
        customer: row.customerId
          ? {
              id: row.customerId,
              displayName: this.resolveCustomerDisplayName(row),
              isCompany: row.customerIsCompany ?? false,
            }
          : null,
      })),
    };
  }

  private resolveCustomerDisplayName(row: RawOrderCalendarRow): string {
    if (row.customerIsCompany && row.customerCompanyName) {
      return row.customerCompanyName;
    }

    return `${row.customerFirstName ?? ''} ${row.customerLastName ?? ''}`.trim();
  }
}
