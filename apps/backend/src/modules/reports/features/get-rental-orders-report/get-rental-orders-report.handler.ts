import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import {
  GetRentalOrdersReportResponseSchema,
  type GetRentalOrdersReportResponseDto,
  type ReportPeriodDto,
  type ReportRentalStatusDto,
} from '@repo/api-contracts';
import { err, ok, type Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import {
  GetCurrentTenantQuery,
  type GetCurrentTenantResult,
} from 'src/modules/tenant-management/public-api/get-current-tenant.public-api';

import { getReportingPeriod, rentalEligibilitySql, toReportCount } from '../../application/reporting-filters';
import { getRentalOrdersReportError, type GetRentalOrdersReportError } from './get-rental-orders-report.errors';
import { GetRentalOrdersReportQuery } from './get-rental-orders-report.query';

export type GetRentalOrdersReportResult = Result<GetRentalOrdersReportResponseDto, GetRentalOrdersReportError>;

type RawRentalReportSummary = {
  total: bigint;
  rentalCount: bigint;
  withInvoiceCount: bigint;
  withoutInvoiceCount: bigint;
};

type RawRentalReportItem = {
  id: string;
  rentalNumber: number;
  customerId: string | null;
  customerName: string | null;
  branchId: string;
  branchName: string | null;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  status: ReportRentalStatusDto;
  currency: string | null;
  acceptedCustomerTotal: string | null;
  hasInvoice: boolean;
  invoices: Prisma.JsonValue;
};

type RawRentalReportRow = RawRentalReportSummary & (RawRentalReportItem | { id: null });

@QueryHandler(GetRentalOrdersReportQuery)
export class GetRentalOrdersReportHandler implements IQueryHandler<
  GetRentalOrdersReportQuery,
  GetRentalOrdersReportResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(query: GetRentalOrdersReportQuery): Promise<GetRentalOrdersReportResult> {
    const tenant = await this.queryBus.execute<GetCurrentTenantQuery, GetCurrentTenantResult>(
      new GetCurrentTenantQuery(query.tenantId),
    );
    if (tenant.isErr()) return err(getRentalOrdersReportError(query.tenantId, tenant.error));

    const period = getReportingPeriod(query.year, query.month, tenant.value.config.timezone);
    const rows = await this.getRows(query, period);
    const summary = rows[0];
    if (!summary) throw new Error('Rental report summary is missing.');

    return ok(
      GetRentalOrdersReportResponseSchema.parse({
        year: query.year,
        month: query.month ?? null,
        period,
        data: rows.flatMap((row) =>
          row.id === null
            ? []
            : [
                {
                  id: row.id,
                  rentalNumber: row.rentalNumber,
                  customer: row.customerId ? { id: row.customerId, name: row.customerName } : null,
                  branch: { id: row.branchId, name: row.branchName },
                  period: { start: row.periodStart.toISOString(), end: row.periodEnd.toISOString() },
                  createdAt: row.createdAt.toISOString(),
                  confirmedAt: row.confirmedAt?.toISOString() ?? null,
                  cancelledAt: row.cancelledAt?.toISOString() ?? null,
                  status: row.status,
                  currency: row.currency,
                  acceptedCustomerTotal: row.acceptedCustomerTotal,
                  hasInvoice: row.hasInvoice,
                  invoices: row.invoices,
                },
              ],
        ),
        total: toReportCount(summary.total),
        page: query.page,
        pageSize: query.pageSize,
        summary: {
          rentalCount: toReportCount(summary.rentalCount),
          withInvoiceCount: toReportCount(summary.withInvoiceCount),
          withoutInvoiceCount: toReportCount(summary.withoutInvoiceCount),
        },
      }),
    );
  }

  private getRows(query: GetRentalOrdersReportQuery, period: ReportPeriodDto): Promise<RawRentalReportRow[]> {
    let invoiceFilter = Prisma.sql`TRUE`;
    if (query.invoicePresence === 'WITH_INVOICE') {
      invoiceFilter = Prisma.sql`has_invoice`;
    } else if (query.invoicePresence === 'WITHOUT_INVOICE') {
      invoiceFilter = Prisma.sql`NOT has_invoice`;
    }
    const offset = (query.page - 1) * query.pageSize;

    return this.prisma.client.$queryRaw<RawRentalReportRow[]>(Prisma.sql`
      WITH eligible_rentals AS MATERIALIZED (
        SELECT r.id, r.tenant_id, r.period_start,
          EXISTS (
            SELECT 1 FROM v2_invoices i
            WHERE i.tenant_id = r.tenant_id AND i.rental_id = r.id AND i.removed_at IS NULL
          ) AS has_invoice
        FROM v2_rentals r
        WHERE ${rentalEligibilitySql(query, period)}
      ), filtered_rentals AS MATERIALIZED (
        SELECT * FROM eligible_rentals WHERE ${invoiceFilter}
      ), summary AS (
        SELECT count(*) AS rental_count,
          count(*) FILTER (WHERE has_invoice) AS with_invoice_count,
          count(*) FILTER (WHERE NOT has_invoice) AS without_invoice_count,
          (SELECT count(*) FROM filtered_rentals) AS total
        FROM eligible_rentals
      ), page AS (
        SELECT * FROM filtered_rentals
        ORDER BY period_start DESC, id DESC
        LIMIT ${query.pageSize} OFFSET ${offset}
      )
      SELECT s.total, s.rental_count AS "rentalCount", s.with_invoice_count AS "withInvoiceCount",
        s.without_invoice_count AS "withoutInvoiceCount",
        p.id, r.rental_number AS "rentalNumber", r.customer_id AS "customerId",
        CASE WHEN c.id IS NULL THEN NULL
          WHEN c.is_company THEN COALESCE(cp.business_name, c.company_name, cp.full_name,
            trim(concat_ws(' ', c.first_name, c.last_name)))
          ELSE COALESCE(cp.full_name, trim(concat_ws(' ', c.first_name, c.last_name)))
        END AS "customerName",
        r.branch_id AS "branchId", b.name AS "branchName",
        r.period_start AS "periodStart", r.period_end AS "periodEnd",
        r.created_at AS "createdAt", r.confirmed_at AS "confirmedAt", r.cancelled_at AS "cancelledAt",
        r.status, r.price_snapshot #>> '{final,currency}' AS currency,
        r.accepted_customer_total::text AS "acceptedCustomerTotal",
        p.has_invoice AS "hasInvoice", invoice_details.invoices
      FROM summary s
      LEFT JOIN page p ON TRUE
      LEFT JOIN v2_rentals r ON r.id = p.id AND r.tenant_id = p.tenant_id
      LEFT JOIN v2_rental_customers c ON c.id = r.customer_id AND c.tenant_id = r.tenant_id
      LEFT JOIN v2_customer_profiles cp ON cp.customer_id = c.id
      LEFT JOIN v2_branches b ON b.id = r.branch_id AND b.tenant_id = r.tenant_id
      LEFT JOIN LATERAL (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'id', i.id, 'reference', i.reference, 'issuedOn', to_char(i.issued_on, 'YYYY-MM-DD'),
          'amount', i.amount::text, 'currency', i.currency
        ) ORDER BY i.created_at, i.id), '[]'::jsonb) AS invoices
        FROM v2_invoices i
        WHERE i.tenant_id = p.tenant_id AND i.rental_id = p.id AND i.removed_at IS NULL
      ) invoice_details ON p.id IS NOT NULL
      ORDER BY p.period_start DESC, p.id DESC
    `);
  }
}
