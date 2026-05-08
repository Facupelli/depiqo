import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { GetOrdersScheduleQuery } from './get-orders-schedule.query';
import { OrderSummary, ScheduleEvent } from '@repo/schemas';
import { PrismaService } from 'src/core/database/prisma.service';
import { OrderStatus } from '@repo/types';
import { GetOrdersScheduleResponseDto } from './get-orders-schedule.response.dto';
import {
  GetLocationContextQuery,
  LocationContextReadModel,
} from 'src/modules/tenant/public/queries/get-location-context.query';

const OPERATIONAL_SCHEDULE_STATUSES = [OrderStatus.CONFIRMED, OrderStatus.ACTIVE] as const;

type RawOrderRow = {
  id: string;
  order_number: number;
  status: OrderStatus;
  pickup_date: string;
  return_date: string;
  pickup_at: string;
  return_at: string;
  event_date: string;
  event_at: string;
  customer_id: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_company_name: string | null;
  customer_is_company: boolean | null;
};

@QueryHandler(GetOrdersScheduleQuery)
export class GetOrdersScheduleQueryHandler implements IQueryHandler<
  GetOrdersScheduleQuery,
  GetOrdersScheduleResponseDto
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(query: GetOrdersScheduleQuery): Promise<GetOrdersScheduleResponseDto> {
    const { tenantId, locationId, from, to } = query;
    const locationContext = await this.queryBus.execute<GetLocationContextQuery, LocationContextReadModel | null>(
      new GetLocationContextQuery(tenantId, locationId),
    );

    if (!locationContext) {
      throw new Error(`Location context not found for location "${locationId}"`);
    }

    const [pickupRows, returnRows] = await Promise.all([
      this.fetchPickups(tenantId, locationId, from, to, locationContext.effectiveTimezone),
      this.fetchReturns(tenantId, locationId, from, to, locationContext.effectiveTimezone),
    ]);

    const pickupEvents: ScheduleEvent[] = pickupRows.map((row) => ({
      eventType: 'PICKUP',
      eventDate: row.event_date,
      eventAt: row.event_at,
      order: this.buildOrderSummary(row),
    }));

    const returnEvents: ScheduleEvent[] = returnRows.map((row) => ({
      eventType: 'RETURN',
      eventDate: row.event_date,
      eventAt: row.event_at,
      order: this.buildOrderSummary(row),
    }));

    const events = [...pickupEvents, ...returnEvents].sort((a, b) => a.eventDate.localeCompare(b.eventDate));

    return { events };
  }

  // Orders whose rental period starts within [from, to].
  // DISTINCT ON (o.id) ensures one row per order even when the order
  // has multiple items — each with its own asset_assignment row.
  private async fetchPickups(
    tenantId: string,
    locationId: string,
    from: string,
    to: string,
    timezone: string,
  ): Promise<RawOrderRow[]> {
    return this.prisma.client.$queryRaw<RawOrderRow[]>`
      SELECT DISTINCT ON (o.id)
        o.id,
        o.status,
        o.order_number,
        to_char(lower(aa.period) AT TIME ZONE ${timezone}, 'YYYY-MM-DD') AS pickup_date,
        to_char(upper(aa.period) AT TIME ZONE ${timezone}, 'YYYY-MM-DD') AS return_date,
        lower(aa.period)::text AS pickup_at,
        upper(aa.period)::text AS return_at,
        to_char(lower(aa.period) AT TIME ZONE ${timezone}, 'YYYY-MM-DD') AS event_date,
        lower(aa.period)::text AS event_at,
        c.id                   AS customer_id,
        c.first_name           AS customer_first_name,
        c.last_name            AS customer_last_name,
        c.company_name         AS customer_company_name,
        c.is_company           AS customer_is_company
      FROM orders o
      JOIN asset_assignments aa ON aa.order_id = o.id
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE
        o.tenant_id = ${tenantId}
        AND
        o.location_id = ${locationId}
        AND o.deleted_at IS NULL
        AND o.status IN (${OPERATIONAL_SCHEDULE_STATUSES[0]}, ${OPERATIONAL_SCHEDULE_STATUSES[1]})
        AND (lower(aa.period) AT TIME ZONE ${timezone})::date BETWEEN ${from}::date AND ${to}::date
    `;
  }

  // Orders whose rental period ends within [from, to].
  private async fetchReturns(
    tenantId: string,
    locationId: string,
    from: string,
    to: string,
    timezone: string,
  ): Promise<RawOrderRow[]> {
    return this.prisma.client.$queryRaw<RawOrderRow[]>`
      SELECT DISTINCT ON (o.id)
        o.id,
        o.status,
        o.order_number,
        to_char(lower(aa.period) AT TIME ZONE ${timezone}, 'YYYY-MM-DD') AS pickup_date,
        to_char(upper(aa.period) AT TIME ZONE ${timezone}, 'YYYY-MM-DD') AS return_date,
        lower(aa.period)::text AS pickup_at,
        upper(aa.period)::text AS return_at,
        to_char(upper(aa.period) AT TIME ZONE ${timezone}, 'YYYY-MM-DD') AS event_date,
        upper(aa.period)::text AS event_at,
        c.id                   AS customer_id,
        c.first_name           AS customer_first_name,
        c.last_name            AS customer_last_name,
        c.company_name         AS customer_company_name,
        c.is_company           AS customer_is_company
      FROM orders o
      JOIN asset_assignments aa ON aa.order_id = o.id
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE
        o.tenant_id = ${tenantId}
        AND
        o.location_id = ${locationId}
        AND o.deleted_at IS NULL
        AND o.status IN (${OPERATIONAL_SCHEDULE_STATUSES[0]}, ${OPERATIONAL_SCHEDULE_STATUSES[1]})
        AND (upper(aa.period) AT TIME ZONE ${timezone})::date BETWEEN ${from}::date AND ${to}::date
    `;
  }

  private buildOrderSummary(row: RawOrderRow): OrderSummary {
    return {
      id: row.id,
      status: row.status,
      number: row.order_number,
      pickupDate: row.pickup_date,
      returnDate: row.return_date,
      pickupAt: row.pickup_at,
      returnAt: row.return_at,
      customer: row.customer_id
        ? {
            id: row.customer_id,
            displayName: this.resolveDisplayName(row),
            isCompany: row.customer_is_company ?? false,
          }
        : null,
    };
  }

  private resolveDisplayName(row: RawOrderRow): string {
    if (row.customer_is_company && row.customer_company_name) {
      return row.customer_company_name;
    }
    return `${row.customer_first_name ?? ''} ${row.customer_last_name ?? ''}`.trim();
  }
}
