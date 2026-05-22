import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { GetCalendarDotsQuery } from './get-calendar-dots.query';
import { PrismaService } from 'src/core/database/prisma.service';
import { OrderStatus } from '@repo/types';
import { GetCalendarDotsResponseDto } from './get-calendar-dots.response.dto';
import {
  GetLocationContextQuery,
  LocationContextReadModel,
} from 'src/modules/tenant/public/queries/get-location-context.query';

type RawDateRow = { date: string };

const OPERATIONAL_CALENDAR_STATUSES = [OrderStatus.CONFIRMED, OrderStatus.ACTIVE] as const;

@QueryHandler(GetCalendarDotsQuery)
export class GetCalendarDotsQueryHandler implements IQueryHandler<GetCalendarDotsQuery, GetCalendarDotsResponseDto> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(query: GetCalendarDotsQuery): Promise<GetCalendarDotsResponseDto> {
    const { tenantId, locationId, from, to } = query;
    const locationContext = await this.queryBus.execute<GetLocationContextQuery, LocationContextReadModel | null>(
      new GetLocationContextQuery(tenantId, locationId),
    );

    if (!locationContext) {
      throw new Error(`Location context not found for location "${locationId}"`);
    }

    const [pickupRows, returnRows] = await Promise.all([
      this.fetchPickupDates(tenantId, locationId, from, to, locationContext.effectiveTimezone),
      this.fetchReturnDates(tenantId, locationId, from, to, locationContext.effectiveTimezone),
    ]);

    return {
      pickupDates: pickupRows.map((r) => r.date),
      returnDates: returnRows.map((r) => r.date),
    };
  }

  private async fetchPickupDates(
    tenantId: string,
    locationId: string,
    from: string,
    to: string,
    timezone: string,
  ): Promise<RawDateRow[]> {
    return this.prisma.client.$queryRaw<RawDateRow[]>`
      SELECT DISTINCT to_char(lower(aa.period) AT TIME ZONE ${timezone}, 'YYYY-MM-DD') AS date
      FROM orders o
      JOIN asset_assignments aa ON aa.order_id = o.id
      WHERE
        o.tenant_id = ${tenantId}
        AND
        o.location_id = ${locationId}
        AND o.deleted_at IS NULL
        AND o.status IN (${OPERATIONAL_CALENDAR_STATUSES[0]}, ${OPERATIONAL_CALENDAR_STATUSES[1]})
        AND (lower(aa.period) AT TIME ZONE ${timezone})::date BETWEEN ${from}::date AND ${to}::date
    `;
  }

  private async fetchReturnDates(
    tenantId: string,
    locationId: string,
    from: string,
    to: string,
    timezone: string,
  ): Promise<RawDateRow[]> {
    return this.prisma.client.$queryRaw<RawDateRow[]>`
      SELECT DISTINCT to_char(upper(aa.period) AT TIME ZONE ${timezone}, 'YYYY-MM-DD') AS date
      FROM orders o
      JOIN asset_assignments aa ON aa.order_id = o.id
      WHERE
        o.tenant_id = ${tenantId}
        AND
        o.location_id = ${locationId}
        AND o.deleted_at IS NULL
        AND o.status IN (${OPERATIONAL_CALENDAR_STATUSES[0]}, ${OPERATIONAL_CALENDAR_STATUSES[1]})
        AND (upper(aa.period) AT TIME ZONE ${timezone})::date BETWEEN ${from}::date AND ${to}::date
    `;
  }
}
