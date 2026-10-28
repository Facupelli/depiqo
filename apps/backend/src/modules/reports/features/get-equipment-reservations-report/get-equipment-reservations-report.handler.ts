import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import {
  GetEquipmentReservationsReportResponseSchema,
  type GetEquipmentReservationsReportResponseDto,
  type ReportPeriodDto,
} from '@repo/api-contracts';
import { err, ok, type Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import {
  GetCurrentTenantQuery,
  type GetCurrentTenantResult,
} from 'src/modules/tenant-management/public-api/get-current-tenant.public-api';

import { getReportingPeriod, rentalEligibilitySql, toReportCount } from '../../application/reporting-filters';
import {
  getEquipmentReservationsReportError,
  type GetEquipmentReservationsReportError,
} from './get-equipment-reservations-report.errors';
import { GetEquipmentReservationsReportQuery } from './get-equipment-reservations-report.query';

export type GetEquipmentReservationsReportResult = Result<
  GetEquipmentReservationsReportResponseDto,
  GetEquipmentReservationsReportError
>;

type RawEquipmentReportItem = {
  equipmentTypeId: string;
  equipmentTypeName: string;
  rentalCount: bigint;
  unitDemand: string;
};

type RawEquipmentReportRow = { total: bigint } & (RawEquipmentReportItem | { equipmentTypeId: null });

@QueryHandler(GetEquipmentReservationsReportQuery)
export class GetEquipmentReservationsReportHandler implements IQueryHandler<
  GetEquipmentReservationsReportQuery,
  GetEquipmentReservationsReportResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(query: GetEquipmentReservationsReportQuery): Promise<GetEquipmentReservationsReportResult> {
    const tenant = await this.queryBus.execute<GetCurrentTenantQuery, GetCurrentTenantResult>(
      new GetCurrentTenantQuery(query.tenantId),
    );
    if (tenant.isErr()) return err(getEquipmentReservationsReportError(query.tenantId, tenant.error));

    const period = getReportingPeriod(query.year, query.month, tenant.value.config.timezone);
    const rows = await this.getRows(query, period);
    const summary = rows[0];
    if (!summary) throw new Error('Equipment report summary is missing.');

    return ok(
      GetEquipmentReservationsReportResponseSchema.parse({
        year: query.year,
        month: query.month ?? null,
        period,
        data: rows.flatMap((row) =>
          row.equipmentTypeId === null
            ? []
            : [
                {
                  equipmentTypeId: row.equipmentTypeId,
                  equipmentTypeName: row.equipmentTypeName,
                  rentalCount: toReportCount(row.rentalCount),
                  unitDemand: toReportCount(row.unitDemand),
                },
              ],
        ),
        total: toReportCount(summary.total),
        page: query.page,
        pageSize: query.pageSize,
      }),
    );
  }

  private getRows(
    query: GetEquipmentReservationsReportQuery,
    period: ReportPeriodDto,
  ): Promise<RawEquipmentReportRow[]> {
    const offset = (query.page - 1) * query.pageSize;

    return this.prisma.client.$queryRaw<RawEquipmentReportRow[]>(Prisma.sql`
      WITH eligible_rentals AS MATERIALIZED (
        SELECT r.id, r.tenant_id
        FROM v2_rentals r
        WHERE ${rentalEligibilitySql(query, period)}
      ), effective_demand AS (
        SELECT r.id AS rental_id, d.equipment_type_id, d.equipment_type_name_snapshot AS name_snapshot,
          (d.quantity::bigint - d.removed_quantity::bigint) AS quantity
        FROM eligible_rentals r
        JOIN v2_rental_demand_lines d ON d.rental_id = r.id AND d.tenant_id = r.tenant_id
        JOIN v2_rental_selections s
          ON s.id = d.rental_selection_id AND s.rental_id = r.id AND s.tenant_id = r.tenant_id
        WHERE s.removed_at IS NULL AND d.removed_at IS NULL AND d.quantity > d.removed_quantity
        UNION ALL
        SELECT r.id, a.equipment_type_id, a.equipment_type_name_snapshot, a.quantity::bigint
        FROM eligible_rentals r
        JOIN rental_accessory_selections a ON a.rental_order_id = r.id AND a.tenant_id = r.tenant_id
        WHERE a.quantity > 0
      ), rental_equipment AS (
        SELECT rental_id, equipment_type_id, sum(quantity) AS unit_demand, min(name_snapshot) AS name_snapshot
        FROM effective_demand
        GROUP BY rental_id, equipment_type_id
      ), equipment_totals AS MATERIALIZED (
        SELECT equipment_type_id, count(*) AS rental_count, sum(unit_demand) AS unit_demand,
          min(name_snapshot) AS name_snapshot
        FROM rental_equipment
        GROUP BY equipment_type_id
      ), summary AS (
        SELECT count(*) AS total FROM equipment_totals
      ), page AS (
        SELECT * FROM equipment_totals
        ORDER BY rental_count DESC, unit_demand DESC, equipment_type_id ASC
        LIMIT ${query.pageSize} OFFSET ${offset}
      )
      SELECT s.total, p.equipment_type_id AS "equipmentTypeId",
        COALESCE(e.name, p.name_snapshot) AS "equipmentTypeName",
        p.rental_count AS "rentalCount", p.unit_demand::text AS "unitDemand"
      FROM summary s
      LEFT JOIN page p ON TRUE
      LEFT JOIN v2_equipment_types e ON e.id = p.equipment_type_id AND e.tenant_id = ${query.tenantId}
      ORDER BY p.rental_count DESC, p.unit_demand DESC, p.equipment_type_id ASC
    `);
  }
}
